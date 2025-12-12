# Weeksy

Apps Script that fills out your weekly report automatically.

## Features

- Fills out your 'Accomplishment' section with:
  - Reported Issues
  - List of Pull Request you create
  - List of PR reviews
- Fills out your 'Meeting' section with meetings you have in your Google Calendar
- Fills out your 'Next Actions' section with issues you have been assigned with
- Fills out your 'OMTM' section with actual GLAIR report
- Fills out your 'Out of Office' with out-of-notice from your Google Calendar
- Sends you an e-mail on success / error.

> [!IMPORTANT]
> This automation doesn't fill the following section:
>   1. `Issues`
>   2. `Technology, Business, Communication, Leadership, Management & Marketing`
>
> As I believe they should be filled manually.

## Prerequisites

This automation requires the following values to be defined the [script properties](https://developers.google.com/apps-script/guides/properties#manage_script_properties_manually).

| Name | Description |
| --- | --- |
| `GITHUB_TOKEN` | A [GitHub access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) that can access repositories that you frequently interact with. Generally, you want to the token to have access to `GDP-ADMIN` organization. |
| `REPORT_USERNAME` | Your name to search the weekly report document (`[Weekly Report: {REPORT_USERNAME}]`) |

## Installation

- [Click the following link](https://script.google.com/macros/library/d/1g_yKhlr3U1daL4nLT4FeB8pA-59dbaVNwaubOUNhyRU92JiW-CmYV0fo/12) to jump-start your project.
- After filling the prerequistes, execute the script `main` function **once** by pressing the `Run` button. Accept all possible required permissions.

## Triggers

Generally, you don't want to run this script manually. Instead, you want to trigger it wth time-based trigger (e.g: On Saturday at 3 PM).:

- In your Apps Script dashboard, navigate to the Trigger page
- Add a new trigger, set it to [Time-Driven](https://medium.com/google-cloud/easily-managing-time-driven-triggers-using-google-apps-script-7fa48546b4e7), set it to any value you want
- Deploy your script instance as a library using the `Deploy` button

## License

This project is licensed under the [Unlicense](./LICENSE)
