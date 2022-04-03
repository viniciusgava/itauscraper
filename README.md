# Itau Scraper
Download Itaú exportable files using node and Puppeteer.
Available file formats:
- PDF
- TXT - It's a CSV with semi-colon *(DEFAULT)*
- OFX - Money 2000
- OFC 1.0 - Money 1995 a Money 1999
- OFC 1.06 - Money
- OFC 1.06 - Quicken

## Usage
```bash
node run.js --branch=0000 --account=00000-0 --password=000000 --days 5 
```

## Usage - Docker
1. Download this seccomp for chrome on docker. It will be used in the docker run:
```bash
wget https://raw.githubusercontent.com/jessfraz/dotfiles/master/etc/docker/seccomp/chrome.json
```

2. Execute:
```bash
docker run -v $(pwd):/home/node/itauscrapper/download \
    -rm \
    -u $UID:$GID \ 
    --security-opt seccomp=./chrome.json \
    -e BRANCH='0000' \
    -e ACCOUNT='00000-0' \
    -e PASSWORD='000000' \
    -e DAYS='000000' \
    viniciusgava/itauscraper:latest 
```
### Details about the dockerfile
This dockerfile has several fixes to be able to executed headless and safe. 
If you wanna know more, check the links bellow:
- fixuid to fix user privileges inside the container when using volumes: 
  - https://github.com/boxboat/fixuid
- fixing user privileges to enable sandbox and keep safety:
  - https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#running-puppeteer-in-docker
  - https://stackoverflow.com/a/62383642
  - https://github.com/jessfraz/dockerfiles/issues/65

## Help
```text
Usage: node run.js [options]

Options:
      --help         Show help                                         [boolean]
      --version      Show version number                               [boolean]
  -b, --branch       Itaú branch number, format: 0000        [string] [required]
  -c, --account      Itaú account number, format: 00000-0    [string] [required]
  -n, --name         Itaú account name, format: Joao                    [string]
  -p, --password     Itaú account digital password(6 digits) [number] [required]
  -d, --days         Transaction log days
                          [number] [required] [choices: 3, 5, 7, 15, 30, 60, 90]
  -f, --file_format  File format to export
    [choices: "pdf", "txt", "ofx", "ofc10", "ofc106", "ofc106quicken"] [default:
                                                                          "txt"]
      --node_env     Node environment
        [choices: "development", "production", "docker"] [default: "production"]
```

## Crontab
1. Create bash like this:
````bash
#!/bin/bash
SCRIPTPATH="$( cd "$(dirname "$0")" ; pwd -P )"

# print current date for debuging proposes
date

# try 5 times
n=0
until [ $n -ge 2 ]
do
    echo "trying $n"
    /usr/bin/docker run -v $SCRIPTPATH/download:/home/node/itauscrapper/download \ 
    --env-file "$SCRIPTPATH/env-configs" \
    --rm \
    -u $UID:$GID \
    --security-opt seccomp=./chrome.json \
    viniciusgava/viniciusgava/itauscraper:latest 2>&1 && break
    n=$[$n+1]
    sleep 15
done
````
**Mac tip:** You must pass docker full path to works at crontab
``/usr/local/bin/docker``

2. add all env variables at ``env-configs``.
Example:
 ```bash
BRANCH=0000
ACCOUNT=00000-0
PASSWORD=000000
DAYS=5
```
**DO NOT** use quotation to define values on env files.

3. run ``crontab -e`` and add the follow cron.
Example:
````bash
0 */4 * * * sh /home/username/automate/itauscraper/run.sh  >> /home/username/automate/itauscraper/log.log
````
The example bellow runs every 4 hours of everyday 

You can generate a different crontab config on [https://crontab-generator.org](https://crontab-generator.org)

## Links
- [GitHub](https://github.com/viniciusgava/itauscraper)
- [Docker Hub](https://hub.docker.com/r/viniciusgava/itauscraper)
