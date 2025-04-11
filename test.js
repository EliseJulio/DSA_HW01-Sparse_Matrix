import fs from "fs";

class SparseMatrix {
  constructor(numRows, numCols) {
    this.rows = numRows;
    this.cols = numCols;
    this.data = new Map();
  }

  static async fromFile(filePath) {
    try {
      const content = await fs.promises.readFile(filePath, "utf8");
      const lines = content.split("\n");
      const rows = parseInt(lines[0].substring(5));
      const cols = parseInt(lines[1].substring(5));
      const matrix = new SparseMatrix(rows, cols);

      for (let i = 2; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line
          .slice(1, -1)
          .split(",")
          .map((x) => parseInt(x.trim()));
        matrix.setElement(values[0], values[1], values[2]);
      }

      return matrix;
    } catch (error) {
      throw new Error(`Error reading file: ${error.message}`);
    }
  }

  getElement(row, col) {
    const rowData = this.data.get(row);
    return rowData ? rowData.get(col) || 0 : 0;
  }

  setElement(row, col, value) {
    if (value === 0) {
      const rowData = this.data.get(row);

      if (rowData) {
        rowData.delete(col);
        if (rowData.size === 0) {
          this.data.delete(row);
        }
      }
    } else {
      if (!this.data.has(row)) {
        this.data.set(row, new Map());
      }
      this.data.get(row).set(col, value);
    }
  }

  add(other) {
    if (this.rows !== other.rows || this.cols !== other.cols) {
      throw new Error("Matrix dimensions must match for addition");
    }

    const result = new SparseMatrix(this.rows, this.cols);

    for (const [row, rowData] of this.data) {
      for (const [col, value] of rowData) {
        result.setElement(row, col, value);
      }
    }
    for (const [row, rowData] of other.data) {
      for (const [col, value] of rowData) {
        const sum = result.getElement(row, col) + value;
        result.setElement(row, col, sum);
      }
    }

    return result;
  }

  subtract(other) {
    if (this.rows !== other.rows || this.cols !== other.cols) {
      throw new Error("Matrix dimensions must match for subtraction");
    }

    const result = new SparseMatrix(this.rows, this.cols);
    for (const [row, rowData] of this.data) {
      for (const [col, value] of rowData) {
        result.setElement(row, col, value);
      }
    }

    for (const [row, rowData] of other.data) {
      for (const [col, value] of rowData) {
        const diff = result.getElement(row, col) - value;
        result.setElement(row, col, diff);
      }
    }

    return result;
  }

  multiply(other) {
    if (this.cols !== other.rows) {
      throw new Error("Invalid dimensions for multiplication");
    }

    const result = new SparseMatrix(this.rows, other.cols);

    for (const [row1, rowData1] of this.data) {
      for (const [col1, val1] of rowData1) {
        const rowData2 = other.data.get(col1);
        if (rowData2) {
          for (const [col2, val2] of rowData2) {
            const current = result.getElement(row1, col2);
            result.setElement(row1, col2, current + val1 * val2);
          }
        }
      }
    }

    return result;
  }
  toString() {
    let result = `rows=${this.rows}\ncols=${this.cols}\n`;
    for (const [row, rowData] of this.data) {
      for (const [col, value] of rowData) {
        result += `(${row}, ${col}, ${value})\n`;
      }
    }
    return result;
  }
}

async function main() {
  if (process.argv.length < 6) {
    console.log(
      "Usage: node main.js <operation> <matrix1_file> <matrix2_file> <output_file>"
    );
    process.exit(1);
  }

  try {
    const operation = process.argv[2];
    const matrix1 = await SparseMatrix.fromFile(process.argv[3]);
    const matrix2 = await SparseMatrix.fromFile(process.argv[4]);
    const outputFile = process.argv[5];

    let result;
    switch (operation) {
      case "add":
        result = matrix1.add(matrix2);
        break;
      case "subtract":
        result = matrix1.subtract(matrix2);
        break;
      case "multiply":
        result = matrix1.multiply(matrix2);
        break;
      default:
        throw new Error("Invalid operation. Use: add, subtract, or multiply");
    }
    await fs.promises.writeFile(outputFile, result.toString());
    console.log(`Result written to ${outputFile}`);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

await main();
