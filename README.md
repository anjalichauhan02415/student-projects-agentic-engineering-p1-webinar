# MyCalculator

A modern, responsive calculator web app built with **HTML5, CSS3 and vanilla JavaScript**. It uses a custom, safe expression parser instead of `eval()`, and includes calculation history, keyboard support and a light/dark theme.

> BCA college project. No frameworks, no build tools, no external APIs.

## Features

- Addition, subtraction, multiplication and division with correct operator precedence
- Decimal and negative numbers (for example `5*-3`)
- AC (clear all) and DEL (delete last character)
- Operator and decimal validation (no `5++3`, no `1.2.3`, no `007`)
- Equals button or Enter key shows the result
- Full keyboard support: digits, `.`, `+ - * /`, Enter, Backspace, Escape
- Friendly errors: "Cannot divide by zero", "Invalid expression"
- History of the last 20 calculations; click an entry to reuse its result; clear history anytime
- Light/dark theme toggle (remembered in the browser)
- Safe parser: no `eval()` and no `Function()`
- Accessible buttons (labels, focus outlines, live result announcements) and a responsive layout

## Folder structure

```
MyCalculator/
├── index.html   # page structure
├── style.css    # themes, layout, responsive design
├── script.js    # parser, calculator logic, history, events
├── README.md    # documentation
└── .gitignore
```

## How the safe parser works

1. **Tokenizer** splits the text (`"25+15*2"`) into numbers and operators and rejects anything else.
2. **Recursive-descent parser** follows the grammar below, so `*` and `/` are evaluated before `+` and `-`:

```
expression = term (('+' | '-') term)*
term       = unary (('*' | '/') unary)*
unary      = '-' unary | number
```

3. Division by zero and invalid input throw an error that is shown as a friendly message. Results are rounded to remove floating-point noise (`0.1 + 0.2 = 0.3`).

## Setup in VS Code

1. Install [Visual Studio Code](https://code.visualstudio.com/).
2. Choose **File > Open Folder...** and select the `MyCalculator` folder.
3. Run it in one of two ways:
   - **Live Server:** install the *Live Server* extension, right-click `index.html`, choose **Open with Live Server**.
   - **Directly:** double-click `index.html` to open it in your browser.

## Test cases

| Input | Expected result |
|-------|-----------------|
| `25 + 15 =` | 40 |
| `8 * 7 =` | 56 |
| `10 / 4 =` | 2.5 |
| `0.1 + 0.2 =` | 0.3 |
| `2 + 3 * 4 =` | 14 |
| `5 * - 3 =` | -15 |
| `- 5 + 3 =` | -2 |
| `5 + * 3 =` (consecutive operators) | 15 (the last operator replaces the first) |
| `1 . 2 . 3` | `1.2` (second decimal point ignored) |
| `0 0 7` | `7` (no leading zeros) |
| `9 / 0 =` | "Cannot divide by zero" |
| Type `123`, press DEL | `12` |
| Press `Esc` | Display resets to 0 |
| Click a history item | Its result is loaded on the display |
| Click the sun/moon button | Theme switches and is remembered after reload |

## Technologies used

HTML5, CSS3 (Grid, Flexbox, CSS variables, media queries), vanilla JavaScript (ES6), `localStorage` for history and theme.

## Deploy with GitHub Pages

1. Push the project to a public repository named `MyCalculator` (see below).
2. On GitHub open **Settings > Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
4. Choose branch **main** and folder **/ (root)**, then click **Save**.
5. Wait 1-2 minutes. Your site will be live at `https://YOUR-USERNAME.github.io/MyCalculator/`.

## Author

Created by *your name* as a BCA project.
