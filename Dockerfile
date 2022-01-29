# References:
# https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#running-puppeteer-in-docker
# https://github.com/boxboat/fixuid
FROM node:16-stretch-slim

# Install latest chrome dev package and fonts to support major charsets (Chinese, Japanese, Arabic, Hebrew, Thai and a few others)
# Note: this installs the necessary libs to make the bundled version of Chromium that Puppeteer
# installs, work.
RUN apt update && \
    apt-get install -y wget curl gnupg ca-certificates --no-install-recommends && \
     wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - && \
     sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list' && \
     apt-get update && \
     apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends && \
     rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    NODE_ENV=docker

# Copy automate
COPY . /home/node/itauscrapper

# Configure a user for pupeteer
RUN usermod -a -G audio,video node && \
     mkdir -p /home/node/Downloads && \
     chown -R node:node /home/node

# install fixuid
RUN USER=node && \
    GROUP=node && \
    curl -SsL https://github.com/boxboat/fixuid/releases/download/v0.5.1/fixuid-0.5.1-linux-amd64.tar.gz | tar -C /usr/local/bin -xzf - && \
    chown root:root /usr/local/bin/fixuid && \
    chmod 4755 /usr/local/bin/fixuid && \
    mkdir -p /etc/fixuid && \
    printf "user: $USER\ngroup: $GROUP\n" > /etc/fixuid/config.yml

ENTRYPOINT ["fixuid"]

# Install dependencies
RUN cd /home/node/itauscrapper && \
     npm install --production

WORKDIR /home/node/itauscrapper

CMD ["node", "run.js"]

# Run everything after as non-privileged user.
USER node:node
