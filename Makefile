build-docker:cleanup
	docker build --no-cache -t viniciusgava/itauscraper:latest .

publish-image:
	docker push viniciusgava/itauscraper:latest

cleanup:
	find ./download/ ! -name '.gitignore' -type f -exec rm -f {} +