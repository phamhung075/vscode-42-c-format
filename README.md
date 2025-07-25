⚠️ If there are any issues with the formatting results, please **file an issue in [dawnbeen/c_formatter_42](https://github.com/dawnbeen/c_formatter_42)** instead of this repository.

# 42 C-Format

42 C-Format is a VScode formatting provider extension for c_formatter_42, which is a c-language formatter that conforms to Norm v3 in 42 schools.

## Features

Provide document formatting using c_formatter_42.

![feature gif](images/feature.gif)

## Usage

- **Installing [`c_formatter_42`](https://github.com/cacharle/c_formatter_42) is required.**

```
$ pip3 install c_formatter_42
$ pip3 install --user c_formatter_42   // if you don't have privilege
```

- Then enable formatting with 42 C-Format, adding configuration as below.

```json
{
    "[c]": {
        "editor.defaultFormatter": "keyhr.42-c-format"
    },
}
```

## Requirements

- `c_formatter_42` ([GitHub Repository](https://github.com/cacharle/c_formatter_42))

## Contributions

Issues and pull requests are welcomed.

## Release Notes

### 0.0.5

Added windows support.

### 0.0.4

Impoved output when catching an error.

### 0.0.3

Added an instruction for installing c\_formatter\_42.

### 0.0.2

Fixed the usage instruction.

### 0.0.1

Initial release.
