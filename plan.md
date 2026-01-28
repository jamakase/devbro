We are building next tool:

App to help developers write code in isolated environment. Main idea - we don't want to use local git worktress - instead we want a fully working isolated environment where claude could run and do everything it wants.

1. App that could start some docker container. Then pull there code from github. Install there claude-code or opencode. And then start user tasks with selected cli.
2. It's possible to select - localhost or remote server
3. for remote server it can connect to it and take care of deployed docker image.
4. for local server it would just start new containers.
5. it should attach some volume to the container so data is not lost.
6. It should be possible to select what cli it would use: opencode/claude. it would install it with npx or some other tool when starting container.
7. telegram app which I could connect to it but we could extend it later.

For later:
1. we could specify skills to install
2. we could specify mcps to pick
3. we could specify specs approach to be used ( speckit / openspec / bmad )

techs: 

1. monorepo using turborepo in typescript
2. UI in typescript using shadcn
3. it should support 