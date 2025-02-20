import fs from "fs";

class CompressedMatrix {
  constructor(totalRows, totalCols) {
    this.numRows = totalRows;
    this.numCols = totalCols;
    this.elements = new Map();
  }

  static async loadFromFile(filepath) {
    try {
      const rawData = await fs.promises.readFile(filepath, "utf8");
      const lines = rawData.split("\n");

      const rowCount = parseInt(lines[0].split("=")[1]);
      const colCount = parseInt(lines[1].split("=")[1]);

      const matrixInstance = new CompressedMatrix(rowCount, colCount);

      for (let i = 2; i < lines.length; i++) {
        const entry = lines[i].trim();
        if (!entry) continue;

        const [r, c, val] = entry.slice(1, -1).split(",").map(Number);
        matrixInstance.insertValue(r, c, val);
      }

      return matrixInstance;
    } catch (err) {
      throw new Error(`Failed to read file: ${err.message}`);
    }
  }

  fetchValue(row, col) {
    return this.elements.get(row)?.get(col) || 0;
  }

  insertValue(row, col, val) {
    if (val === 0) {
      this.elements.get(row)?.delete(col);
      if (this.elements.get(row)?.size === 0) this.elements.delete(row);
    } else {
      if (!this.elements.has(row)) this.elements.set(row, new Map());
      this.elements.get(row).set(col, val);
    }
  }

  combineWith(otherMatrix, operation) {
    if (this.numRows !== otherMatrix.numRows || this.numCols !== otherMatrix.numCols) {
      throw new Error("Matrix dimensions do not align");
    }
    const outputMatrix = new CompressedMatrix(this.numRows, this.numCols);
    for (const [row, rowEntries] of this.elements) {
      for (const [col, val] of rowEntries) {
        outputMatrix.insertValue(row, col, val);
      }
    }
    for (const [row, rowEntries] of otherMatrix.elements) {
      for (const [col, val] of rowEntries) {
        const newVal = operation === "add" ? outputMatrix.fetchValue(row, col) + val : outputMatrix.fetchValue(row, col) - val;
        outputMatrix.insertValue(row, col, newVal);
      }
    }
    return outputMatrix;
  }

  multiplyWith(otherMatrix) {
    if (this.numCols !== otherMatrix.numRows) {
      throw new Error("Invalid multiplication dimensions");
    }
    const resultMatrix = new CompressedMatrix(this.numRows, otherMatrix.numCols);
    for (const [rowA, colEntriesA] of this.elements) {
      for (const [colA, valA] of colEntriesA) {
        if (!otherMatrix.elements.has(colA)) continue;
        for (const [colB, valB] of otherMatrix.elements.get(colA)) {
          const currentVal = resultMatrix.fetchValue(rowA, colB);
          resultMatrix.insertValue(rowA, colB, currentVal + valA * valB);
        }
      }
    }
    return resultMatrix;
  }

  formatOutput() {
    let output = `rows=${this.numRows}\ncols=${this.numCols}\n`;
    for (const [row, colEntries] of this.elements) {
      for (const [col, val] of colEntries) {
        output += `(${row}, ${col}, ${val})\n`;
      }
    }
    return output;
  }
}

async function execute() {
  if (process.argv.length < 6) {
    console.log("Usage: node script.js <operation> <matrixA_file> <matrixB_file> <output_file>");
    process.exit(1);
  }

  try {
    const task = process.argv[2];
    const matrixA = await CompressedMatrix.loadFromFile(process.argv[3]);
    const matrixB = await CompressedMatrix.loadFromFile(process.argv[4]);
    const outputPath = process.argv[5];

    let finalMatrix;
    if (task === "add" || task === "subtract") {
      finalMatrix = matrixA.combineWith(matrixB, task);
    } else if (task === "multiply") {
      finalMatrix = matrixA.multiplyWith(matrixB);
    } else {
      throw new Error("Unsupported operation. Choose: add, subtract, or multiply");
    }

    await fs.promises.writeFile(outputPath, finalMatrix.formatOutput());
    console.log(`Computation complete. Results saved to ${outputPath}`);
  } catch (err) {
    console.error("Execution error:", err.message);
    process.exit(1);
  }
}

await execute();
