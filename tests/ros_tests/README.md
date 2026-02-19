# RULES
- We assume that in between steps of *a specific test* the ssh session stays the same and the steps are run in succession: so for example "cd folder", then step 2 says "ls" should list all files in the folder we entered
- We assume that in between *tests* we reset the session so that the previous tests don't affect the later ones
- We have for each step an *index* this can be used later to skip the steps if we don't want them