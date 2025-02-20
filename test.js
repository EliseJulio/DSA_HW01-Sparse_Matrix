import fs from "fs";

class SparseMatrix {
  constructor(rowCount, colCount) {
    this.numRows = rowCount;
    this.numCols = colCount;
    this.elements = new Map();
  }

  static async fromFile(filePath) {
    try {
      const fileData = await fs.promises.readFile(filePath, "utf8");
      const lines = fileData.split("\n");

      const rows = parseInt(lines[0].split("=")[1]);
      const cols = parseInt(lines[1].split("=")[1]);

      const sparseMatrix = new SparseMatrix(rows, cols);

      for (let i = 2; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const [row, col, value] = line.slice(1, -1).split(",").map(Number);
        sparseMatrix.setElement(row, col, value);
      }

      return sparseMatrix;
    } catch (error) {
      throw new Error(`Error reading file: ${error.message}`);
    }
  }

  getElement(row, col) {
    return this.elements.get(row)?.get(col) || 0;
  }

  setElement(row, col, value) {
    if (value === 0) {
      this.elements.get(row)?.delete(col);
      if (this.elements.get(row)?.size === 0) this.elements.delete(row);
    } else {
      if (!this.elements.has(row)) this.elements.set(row, new Map());
      this.elements.get(row).set(col, value);
    }
  }

  add(otherMatrix) {
    if (this.numRows !== otherMatrix.numRows || this.numCols !== otherMatrix.numCols) {
      throw new Error("Matrix dimensions must match for addition");
    }
    const resultMatrix = new SparseMatrix(this.numRows, this.numCols);
    for (const [row, colValues] of this.elements) {
      for (const [col, val] of colValues) {
        resultMatrix.setElement(row, col, val);
      }
    }
    for (const [row, colValues] of otherMatrix.elements) {
      for (const [col, val] of colValues) {
        resultMatrix.setElement(row, col, resultMatrix.getElement(row, col) + val);
      }
    }
    return resultMatrix;
  }

  subtract(otherMatrix) {
    if (this.numRows !== otherMatrix.numRows || this.numCols !== otherMatrix.numCols) {
      throw new Error("Matrix dimensions must match for subtraction");
    }
    const resultMatrix = new SparseMatrix(this.numRows, this.numCols);
    for (const [row, colValues] of this.elements) {
      for (const [col, val] of colValues) {
        resultMatrix.setElement(row, col, val);
      }
    }
    for (const [row, colValues] of otherMatrix.elements) {
      for (const [col, val] of colValues) {
        resultMatrix.setElement(row, col, resultMatrix.getElement(row, col) - val);
      }
    }
    return resultMatrix;
  }

  multiply(otherMatrix) {
    if (this.numCols !== otherMatrix.numRows) {
      throw new Error("Invalid matrix dimensions for multiplication");
    }
    const resultMatrix = new SparseMatrix(this.numRows, otherMatrix.numCols);
    for (const [rowA, colValuesA] of this.elements) {
      for (const [colA, valA] of colValuesA) {
        if (!otherMatrix.elements.has(colA)) continue;
        for (const [colB, valB] of otherMatrix.elements.get(colA)) {
          resultMatrix.setElement(rowA, colB, resultMatrix.getElement(rowA, colB) + valA * valB);
        }
      }
    }
    return resultMatrix;
  }

  toString() {
    let output = `rows=${this.numRows}\ncols=${this.numCols}\n`;
    for (const [row, colValues] of this.elements) {
      for (const [col, val] of colValues) {
        output += `(${row}, ${col}, ${val})\n`;
      }
    }
    return output;
  }
}

async function main() {
  if (process.argv.length < 6) {
    console.log("Usage: node script.js <operation> <matrix1.txt> <matrix2.txt> <result.txt>");
    process.exit(1);
  }

  try {
    const operation = process.argv[2];
    const matrix1 = await SparseMatrix.fromFile(process.argv[3]);
    const matrix2 = await SparseMatrix.fromFile(process.argv[4]);
    const outputFile = process.argv[5];

    let resultMatrix;
    if (operation === "add") {
      resultMatrix = matrix1.add(matrix2);
    } else if (operation === "subtract") {
      resultMatrix = matrix1.subtract(matrix2);
    } else if (operation === "multiply") {
      resultMatrix = matrix1.multiply(matrix2);
    } else {
      throw new Error("Invalid operation. Use: add, subtract or multiply");
    }

    await fs.promises.writeFile(outputFile, resultMatrix.toString());
    console.log(`Output results are added to ${outputFile}`);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

await main();
