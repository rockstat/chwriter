
bump-patch:
	bumpversion patch

bump-minor:
	bumpversion minor


build:
	docker build -t chwriter .

build_amd64:
	docker buildx build --platform linux/amd64 -t chwriter .	

tag-ng:
	docker tag chwriter rockstat/chwriter:ng

tag-latest:
	docker tag chwriter rockstat/chwriter:latest

push-latest:
	docker push rockstat/chwriter:latest

push-ng:
	docker push rockstat/chwriter:ng

all-ng: build_amd64 tag-ng push-ng

push-dev:
	docker tag chwriter rockstat/chwriter:dev
	docker push rockstat/chwriter:dev

to_master:
	@echo $(BR)
	git checkout master && git merge $(BR) && git checkout $(BR)
