# Itau Scraper
Download Itaú exportable files using node and Puppeteer.
Available file formats:
- OFC 1.0 - Money 1995 a Money 1999
- OFC 1.06 - Quicken 6
- OFX - Money 2000 *(DEFAULT)*
- TXT - It's a CSV with semi-colon

## Usage
```bash
node run.js --branch=0000 --account=00000-0 --password=000000 --days 5 
```

## Usage - Docker
```bash
docker run -v $(pwd):/usr/itauscrapper/download \
    -e BRANCH='0000' \
    -e ACCOUNT='00000-0' \
    -e PASSWORD='000000' \
    -e DAYS='000000' \
    -rm \
    viniciusgava/itauscraper:latest 
```


## Help
```text
Usage: node run.js [options]

Options:
  --help             Show help                                         [boolean]
  --version          Show version number                               [boolean]
  --branch, -b       Itaú branch number, format: 0000        [string] [required]
  --account, -c      Itaú account number, format: 00000-0    [string] [required]
  --password, -p     Itaú account digital password(6 digits) [number] [required]
  --days, -d         Transaction log days                    [number] [required]
  --file_format, -f  File format to export
                      [choices: "ofc1", "ofc106", "ofx", "txt"] [default: "ofx"]
  --node_env         Node environment
        [choices: "development", "production", "docker"] [default: "production"]
```

## Crontab
First create bash like this:
````bash
#!/bin/bash
SCRIPTPATH="$( cd "$(dirname "$0")" ; pwd -P )"

# print current date at log
date

# try 5 times
n=0
until [ $n -ge 2 ]
do
    echo "trying $n"
    /usr/bin/docker run --env-file "$SCRIPTPATH/env-configs" \
    --rm \
    viniciusgava/viniciusgava/itauscraper:latest 2>&1 && break
    n=$[$n+1]
    sleep 15
done

````
**Mac tip:** You must to pass docker full path to works at crontab
``/usr/local/bin/docker``

Second add all env variables at ``env-configs``.
Example:
 ```bash
BRANCH=0000
ACCOUNT=00000-0
PASSWORD=000000
DAYS=5
```
**DO NOT** use quotation to define values on env files.

Then run ``crontab -e`` and add the follow cron.
Example:
````bash
0 */4 * * * sh /home/username/automate/itauscraper/run.sh  >> /home/username/automate/itauscraper/log.log
````
The example bellow runs every 4 hours of all days 

You can generate a different crontab config on [https://crontab-generator.org](https://crontab-generator.org)

## Links
- [GitHub](https://github.com/viniciusgava/itauscraper)
- [Docker Hub](https://hub.docker.com/r/viniciusgava/itauscraper) 