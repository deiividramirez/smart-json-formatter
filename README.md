# Smart JSON Formatter

<p align="center">
  <img src="icon.png" alt="Smart JSON Formatter Icon" width="128"/>
</p>

**Stop wasting vertical screen space.**

Smart JSON Formatter is a "fractal" formatter for VS Code. Unlike standard formatters that force every item onto a new line, this extension intelligently groups simple objects and lists onto single lines while keeping complex nested structures expanded.

It optimizes for **readability** and **information density**.

---

## 🚀 Features

*   **Fractal Formatting:** Automatically detects if a list or object is "simple" enough to fit on one line.
*   **Space Efficient:** Reduces file line count by 30-50% for data-heavy files (e.g., 3D coordinates, simple configuration lists).
*   **Width Aware:** Respects a maximum line width (default: 80 characters). If an object exceeds this, it gracefully expands.
*   **Recursive Logic:** Works perfectly on deeply nested structures.

## ↔️ Comparison

### Standard Formatter (Prettier / VS Code Default)
*Wastes space on simple data.*

```json
{
  "id": 1,
  "name": "Camera Settings",
  "position": [
    12.5,
    45.2,
    0.0
  ],
  "flags": [
    "enabled",
    "visible",
    "locked"
  ]
}
```
Smart JSON Formatter

Compact, readable, and lightweight.

```json
{
  "id": 1,
  "name": "Camera Settings",
  "position": [12.5, 45.2, 0.0],
  "flags": ["enabled", "visible", "locked"]
}
```

## 📋 Requirements

This extension relies on a lightweight Python script to perform the layout calculations.

Python 3 must be installed on your system.

It must be available in your system path (terminal) as python3 (Mac/Linux) or python (Windows).

Note: The extension automatically detects your OS to choose the correct command.

## 💻 Usage

Open any .json or .jsonc file.

Right-click the editor and select Format Document With...

Choose Smart JSON Formatter.

To make it your default:

Open a JSON file.

Right-click -> Format Document With... -> Configure Default Formatter...

Select Smart JSON Formatter.

Now just press Shift + Alt + F (Mac: Shift + Option + F).

## ⚙️ Extension Settings

Currently, the formatter operates with an opinionated standard configuration:

Indent: 2 Spaces

Max Width: 80 Characters

Future updates may allow configuration of these values via VS Code Settings.

## 🔧 Troubleshooting

Error: "JSON Format Failed"

Ensure the file is valid JSON.

Open the Output panel or Developer Tools (Help > Toggle Developer Tools) to see the specific Python error.

Error: "python3: command not found"

Ensure Python is installed and added to your system's PATH environment variable.

Publisher: David Ramirez
License: MIT

### Tips for Publishing
If you decide to publish this to the actual VS Code Marketplace:
1.  **Repo:** You must put your code in a public Git repository (GitHub/GitLab).
2.  **Fields:** In `package.json`, ensure the `"repository"` field points to that URL.
3.  **Account:** You need to create a publisher account at [marketplace.visualstudio.com](https://marketplace.visualstudio.com).