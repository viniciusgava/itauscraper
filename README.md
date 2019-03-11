# Itau Scraper
Download Itaú OFX file using node and Puppeteer.

## Usage
```bash
node run.js --branch=0000 --account=00000-0 --password=000000 --days 5 
```

## Help
```text
Usage: node run.js [options]

Options:
  --help          Show help                                            [boolean]
  --version       Show version number                                  [boolean]
  --branch, -b    Itaú branch number, format: 0000           [string] [required]
  --account, -c   Itaú account number, format: 00000-0       [string] [required]
  --password, -p  Itaú account digital password(6 digits)    [number] [required]
  --days, -d      Transaction log days                       [number] [required]
  --node_env      Node environment
                  [choices: "development", "production"] [default: "production"]
```
