# Weeksy

Apps Script that fills out your weekly report automatically.

## Features

- Fills out your 'Accomplishment' section with:
  - Reported Issues
  - List of Pull Request you create
  - List of PR reviews
- Fills out your 'Meeting' section with meetings you have in your Google Calendar
- Sends you an e-mail on error

## Prerequisites

- A [GitHub access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) that can access repositories that you frequently interact with.

> [!NOTE]
> Generally, you want to the token to have access to `GDP-ADMIN` organization.

## Installation

- [Click the following link](https://script.google.com/d/1g_yKhlr3U1daL4nLT4FeB8pA-59dbaVNwaubOUNhyRU92JiW-CmYV0fo/edit?usp=sharing) to jump-start your project.
- In your Apps Script dashboard, navigate to Project Settings page
- Add a script property, name it `GITHUB_TOKEN` and use the prepared GitHub token as value.
- In your Apps Script dashboard, navigate to the Trigger page
- Add a new trigger, set it to [Time-Driven](https://medium.com/google-cloud/easily-managing-time-driven-triggers-using-google-apps-script-7fa48546b4e7), set it to any value you want
- Deploy your script instance as a library using the `Deploy` button

> [!NOTE]
> A good time-driven trigger value is every week on Saturday at 10AM GMT+7

## License

This project is licensed under the [Unlicense](./LICENSE)
