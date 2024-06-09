# Dockerfile.build
FROM ubuntu:focal

RUN apt-get update
RUN apt-get install -y curl git

# Install Node.js
RUN curl -sL https://deb.nodesource.com/setup_20.x | bash -
RUN apt-get upgrade -y
RUN apt-get install -y nodejs

WORKDIR /home/app

# Copy the build script
COPY main.sh /home/app/main.sh
RUN chmod +x /home/app/main.sh

ENTRYPOINT ["/home/app/main.sh"]
