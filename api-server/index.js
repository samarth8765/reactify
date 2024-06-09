const express = require("express");
const {
  ECSClient,
  RunTaskCommand,
  DescribeTasksCommand,
} = require("@aws-sdk/client-ecs");
const app = express();
const PORT = process.env.PORT || 8000;
const deploymentStatuses = {};

const ecsClient = new ECSClient({
  region: "region-name",
  credentials: {
    accessKeyId: process.env.accessKeyId,
    secretAccessKey: process.env.secretAccessKey,
  },
});

app.use(express.json());

const clusterName = "cluster-name";
const subnets = ["your subnets"];
const securityGroups = ["security-groups"];

async function runTask(taskDefinition, overrides) {
  const params = {
    cluster: clusterName,
    taskDefinition: taskDefinition,
    launchType: "FARGATE",
    networkConfiguration: {
      awsvpcConfiguration: {
        subnets: subnets,
        securityGroups: securityGroups,
        assignPublicIp: "ENABLED",
      },
    },
    overrides: overrides,
  };

  try {
    const command = new RunTaskCommand(params);
    const data = await ecsClient.send(command);
    const taskArn = data.tasks[0].taskArn;
    return taskArn;
  } catch (err) {
    console.log(`Fail to build the task ${err.message}`);
    throw err;
  }
}

async function waitForTaskCompletion(taskArn) {
  const params = {
    cluster: clusterName,
    tasks: [taskArn],
  };

  console.log(`Waiting for task ${taskArn} to complete...`);
  while (true) {
    const command = new DescribeTasksCommand(params);
    const data = await ecsClient.send(command);
    const task = data.tasks[0];
    if (task.lastStatus === "STOPPED") {
      if (task.containers[0].exitCode === 0) {
        console.log(`Task ${taskArn} is completed`);
        return;
      } else {
        console.log(
          `Task ${taskArn} failed with exit code ${task.containers[0].exitCode}.
          Error message : ${err.message}`
        );
        throw new Error("Task failed");
      }
    }

    await new Promise((res) => setTimeout(res, 5000));
  }
}

app.post("/deploy", async (req, res) => {
  const gitURL = req.body.gitURL;
  const projectId = req.body.projectId;
  const buildTaskDefinition = "";
  const deployTaskDefinition = "";

  const buildOverrides = {
    containerOverrides: [
      {
        name: "",
        environment: [
          {
            name: "GIT_REPOSITORY_URL",
            value: gitURL,
          },
          {
            name: "PROJECT_ID",
            value: projectId,
          },
        ],
      },
    ],
  };

  const deployOverrides = {
    containerOverrides: [
      {
        name: "",
        environment: [
          { name: "PROJECT_ID", value: projectId },
          { name: "AWS_ACCESS_KEY_ID", value: process.env.accessKeyId },
          { name: "AWS_SECRET_ACCESS_KEY", value: process.env.secretAccessKey },
        ],
      },
    ],
  };

  deploymentStatuses[projectId] = "waiting";
  res.json({ status: deploymentStatuses[projectId] });

  try {
    deploymentStatuses[projectId] = "building";
    console.log("Build Started");
    const buildTaskArn = await runTask(buildTaskDefinition, buildOverrides);
    await waitForTaskCompletion(buildTaskArn);
    console.log("Build Completed");

    deploymentStatuses[projectId] = "deploying";
    console.log("Deploy Started");
    const deployTaskArn = await runTask(deployTaskDefinition, deployOverrides);
    await waitForTaskCompletion(deployTaskArn);

    deploymentStatuses[projectId] = "Finished";
    console.log("Deploy Completed");
  } catch (err) {
    deploymentStatuses[projectId] = "error";
    console.error("Error during deployment process:", err);
  }
});

app.get("/status/:projectId", (req, res) => {
  const projectId = req.params.projectId;
  const status = deploymentStatuses[projectId] || "unknown";
  return res.json({ status: status });
});

app.listen(PORT, () => {
  console.log(`Listening on PORT ${PORT}`);
});
