# Reactify

## Services and Folders Overview

- **api-server**: HTTP API Server for REST APIs.
- **build-server**: Contains Docker image code which clones, builds, and pushes the build to S3.
- **s3-reverse-proxy**: Reverse proxies the subdomains and domains to S3 bucket static assets.

## Local Setup

### Install Dependencies

Run the following command in each service directory (`api-server`, `build-server`, `s3-reverse-proxy`):

```bash
npm install
```

## Setup API-Server
- Provide all the required configurations such as TASK ARN and CLUSTER ARN in the api-server configuration file.

Run the Servers
- Start the api-server by navigating to its directory and running:

```bash
node index.js
```
- Start the s3-reverse-proxy by navigating to its directory and running:
```bash
node index.js
```

## Architecture Summary

<img src="https://drive.google.com/uc?export=view&id=16s19Wj2DmlYxTvH-oea8kxupGKmB1gLG">

1. Client Request to API Server

    - Clients send a request to the api-server with their GitHub URL to build their project.

2. Isolated Container for Build
     - Upon receiving the URL, the api-server starts an isolated container on AWS ECS to build the project.

4. Output Stored in EFS

    - The output of this build process is stored in a volume linked with Amazon EFS.

4. Upload to S3 in Separate Container

    - A new Docker container is started to upload the build files from EFS to S3.

## Security Considerations: Separate Containers for Build and Upload
- Reason for Separation:

    - Security: The build process can potentially contain malicious code that could expose sensitive information like access keys from the Docker environment. By separating the build and upload processes into different containers, we can mitigate the risk of exposing these credentials.
    - Example of a Malicious Build Command
  

  ```dockerfile
  # Start from a base image
  FROM node:14
  
  # Set working directory
  WORKDIR /app
  
  # Copy package.json and install dependencies
  COPY package.json .
  RUN npm install
  
  # Copy the rest of the application code
  COPY . .
  
  # Malicious command to expose AWS access keys
  RUN echo "AWS_ACCESS_KEY_ID: $AWS_ACCESS_KEY_ID" >> /app/secrets.txt
  RUN echo "AWS_SECRET_ACCESS_KEY: $AWS_SECRET_ACCESS_KEY" >> /app/secrets.txt
  
  # Build the project
  RUN npm run build
  
  # Expose the port and start the application
  EXPOSE 3000
  CMD ["npm", "start"]
  ```
- Explanation: 
  - The malicious Dockerfile includes commands to echo the environment variables AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY into a file (secrets.txt). This could expose sensitive information if not properly managed.

## Unique URL for Client Project

- A unique URL like a1.domain.com is generated for the client’s project.

## Reverse Proxy Setup

- When a1.domain.com is called, the request is reverse proxied through s3-reverse-proxy, which fetches the content from S3 and forwards it to the client.
