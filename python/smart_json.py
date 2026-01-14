import json
import sys
import re


class SmartJSONEncoder:
    """
    A custom formatter that balances readability and compactness.
    It is not a subclass of json.JSONEncoder because we need strict control
    over whitespace and recursive indentation logic.
    """

    def __init__(self, indent=2, max_width=120):
        self.indent_step = indent
        self.max_width = max_width

    def encode(self, obj):
        return self._format(obj, 0)

    def _format(self, obj, level):
        """Recursively format the object."""
        # 1. Handle Primitives (Strings, Numbers, Bools, None)
        if isinstance(obj, (str, int, float, bool, type(None))):
            return json.dumps(obj)

        # 2. Prepare indentation strings
        current_indent_str = " " * (level * self.indent_step)
        next_indent_str = " " * ((level + 1) * self.indent_step)

        # 3. Handle Lists
        if isinstance(obj, list):
            if not obj:
                return "[]"

            # Attempt to format as a single compact line
            compact_items = [self._format(x, 0) for x in obj]
            compact_repr = "[" + ", ".join(compact_items) + "]"

            # Check if it fits on one line (taking current indent into account)
            if len(compact_repr) + len(current_indent_str) <= self.max_width:
                return compact_repr

            # If too long, format with newlines
            expanded_items = [self._format(x, level + 1) for x in obj]
            body = ",\n".join(f"{next_indent_str}{item}" for item in expanded_items)
            return f"[\n{body}\n{current_indent_str}]"

        # 4. Handle Dictionaries
        if isinstance(obj, dict):
            if not obj:
                return "{}"

            # Attempt to format as a single compact line
            compact_pairs = [
                f"{json.dumps(k)}: {self._format(v, 0)}" for k, v in obj.items()
            ]
            compact_repr = "{ " + ", ".join(compact_pairs) + " }"

            # Check if it fits on one line
            if len(compact_repr) + len(current_indent_str) <= self.max_width:
                return compact_repr

            # If too long, format with newlines
            expanded_pairs = []
            for k, v in obj.items():
                key_str = json.dumps(k)
                val_str = self._format(v, level + 1)
                expanded_pairs.append(f"{next_indent_str}{key_str}: {val_str}")

            body = ",\n".join(expanded_pairs)
            return f"{{\n{body}\n{current_indent_str}}}"

        # Fallback for unexpected types (dates, etc) -> stringify them
        return json.dumps(str(obj))


# --- HELPER TO PREVENT CRASHES ---
def strip_comments(text):
    """
    Removes // and /* */ comments so json.loads doesn't crash.
    Keeps URL strings like 'http://...' intact.
    """
    pattern = r'("[^"\\]*(?:\\.[^"\\]*)*")|(\'[^\'\\]*(?:\\.[^\'\\]*)*\')|(/\*[^*]*\*+(?:[^/*][^*]*\*+)*/)|(//.*)'

    def replace(match):
        if match.group(1):
            return match.group(1)  # Keep double-quoted strings
        if match.group(2):
            return match.group(2)  # Keep single-quoted strings
        return ""  # Remove comments

    return re.sub(pattern, replace, text)


# --- MAIN EXECUTION ---
if __name__ == "__main__":
    try:
        # 1. Read Input
        input_data = sys.stdin.read()
        if not input_data.strip():
            sys.exit(0)

        # 2. Clean Comments (This allows the class to work without error)
        clean_data = strip_comments(input_data)

        # 3. Parse JSON
        data = json.loads(clean_data)

        # 4. Format using your class
        encoder = SmartJSONEncoder(max_width=120)
        formatted = encoder.encode(data)
        print(formatted, end="")

    except json.JSONDecodeError as e:
        sys.stderr.write(f"JSON Error: {e}")
        sys.exit(1)
    except Exception as e:
        sys.stderr.write(f"Error: {e}")
        sys.exit(1)
