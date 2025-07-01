I want build a helper bot which will do some job for me in nodejs which utilize AI power, let install any dependecies you need
**features**
- convert existed feature from the @pr.sh na d@pr-approve.sh into nodejs code , FYI: pr.sh is shell file which help me to create and approve github PR
- add function to decode any jwt token
- add a function to convert rate of from_currency to to_another, default from_currency will be USD to VND, pls use some api from Vietnamese bank like techcombank, vietcombank
- in a repo context: summary what my current working code from yesterday  based on github file changes, and tell me what to do and plan

# new fearure 1
- I want to send notification on pc for certain events like on 25th I will send currency rate USD to VND or send calendar meeting event, let use simple `node-notifier` for that unless you have better suggestion.


**usage:**
I want simple usage like
- AI mode: accept human language like: `bot create pr to develop branch and assign userA,userB to reviewers, give me the pr link`
- script mode: `bot pr -r userA,userB` // create pr to default develop branch and give me the pr link

**expected:**
- make it scalable so I can add new feature later