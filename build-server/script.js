const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");
const path = require("path");
const mime = require("mime-types");

const PROJECT_ID = process.env.PROJECT_ID;

const client = new S3Client({
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

function readDirectoryRecursive(dirPath) {
  let results = [];

  const list = fs.readdirSync(dirPath);

  list.forEach((file) => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat && stat.isDirectory()) {
      results = results.concat(readDirectoryRecursive(filePath));
    } else {
      results.push(filePath);
    }
  });

  return results;
}

async function uploadAndClean() {
  try {
    const projectFolder = path.join(__dirname, "output", PROJECT_ID);
    const distFolder = path.join(projectFolder, "dist");
    const files = readDirectoryRecursive(distFolder);
    console.log(files);

    for (const file of files) {
      const relativeFilePath = path.relative(distFolder, file);
      console.log("Uploading", relativeFilePath);

      const command = new PutObjectCommand({
        Bucket: "projects-outputs",
        Body: fs.createReadStream(file),
        Key: `__outputs/${PROJECT_ID}/${relativeFilePath}`,
        ContentType: mime.lookup(file) || "application/octet-stream",
      });

      await client.send(command);
      console.log("Uploaded", file);
    }

    for (const file of files) {
      fs.unlinkSync(file);
      console.log("Deleted", file);
    }

    function removeEmptyDirectories(directory) {
      const fileNames = fs.readdirSync(directory);

      if (fileNames.length > 0) {
        fileNames.forEach(function (fileName) {
          const filePath = path.join(directory, fileName);
          if (fs.statSync(filePath).isDirectory()) {
            removeEmptyDirectories(filePath);
          }
        });

        if (fs.readdirSync(directory).length === 0) {
          fs.rmdirSync(directory);
          console.log("Deleted directory", directory);
        }
      } else {
        fs.rmdirSync(directory);
        console.log("Deleted empty directory", directory);
      }
    }

    removeEmptyDirectories(projectFolder);
  } catch (err) {
    console.error("Deployment failed", err.message);
  }
}

uploadAndClean();
