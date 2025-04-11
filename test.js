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
      const lines = fileData.trim().split("\n").map(line => line.trim()).filter(line => line.length > 0);
      
      if (lines.length < 2) {
        throw new Error("Invalid file format: not enough lines");
      }
      
      let rows = -1;
      let cols = -1;
      let lineIndex = 0;
      
      for (let i = 0; i < Math.min(5, lines.length); i++) {
        const line = lines[i].toLowerCase();
        
        const rowMatch = line.match(/(?:row|rows)[^\d]*(\d+)/i);
        if (rowMatch && rows === -1) {
          rows = parseInt(rowMatch[1]);
          lineIndex = Math.max(lineIndex, i + 1);
        }
        
        const colMatch = line.match(/(?:col|cols|column|columns)[^\d]*(\d+)/i);
        if (colMatch && cols === -1) {
          cols = parseInt(colMatch[1]);
          lineIndex = Math.max(lineIndex, i + 1);
        }
        
        if (rows !== -1 && cols !== -1) break;
      }
      
      if (rows === -1 || cols === -1) {
        for (let i = 0; i < lines.length; i++) {
          const elementMatch = lines[i].match(/\((\d+)[,\s]+(\d+)[,\s]+(-?\d+(?:\.\d+)?)\)/);
          if (elementMatch) {
            lineIndex = i;
            const maxRow = parseInt(elementMatch[1]);
            const maxCol = parseInt(elementMatch[2]);
            
            let tempMaxRow = maxRow;
            let tempMaxCol = maxCol;
            
            for (let j = i; j < lines.length; j++) {
              const match = lines[j].match(/\((\d+)[,\s]+(\d+)[,\s]+(-?\d+(?:\.\d+)?)\)/);
              if (match) {
                tempMaxRow = Math.max(tempMaxRow, parseInt(match[1]));
                tempMaxCol = Math.max(tempMaxCol, parseInt(match[2]));
              }
            }
            
            rows = rows === -1 ? tempMaxRow + 1 : rows;
            cols = cols === -1 ? tempMaxCol + 1 : cols;
            break;
          }
        }
      }
      
      if (rows === -1 || cols === -1) {
        throw new Error("Could not determine matrix dimensions");
      }
      
      if (rows <= 0 || cols <= 0) {
        throw new Error(`Invalid matrix dimensions: ${rows}×${cols}`);
      }
      
      const sparseMatrix = new SparseMatrix(rows, cols);
      
      let elementsFound = false;
      for (let i = lineIndex; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/\((\d+)[,\s]+(\d+)[,\s]+(-?\d+(?:\.\d+)?)\)/) || 
                      line.match(/(\d+)[,\s]+(\d+)[,\s]+(-?\d+(?:\.\d+)?)/);
        
        if (match) {
          elementsFound = true;
          const row = parseInt(match[1]);
          const col = parseInt(match[2]);
          const value = parseFloat(match[3]);
          
          if (row < rows && col < cols) {
            sparseMatrix.setElement(row, col, value);
          }
        }
      }
      
      if (!elementsFound) {
        console.warn("Warning: No matrix elements found in the file");
      }
      
      return sparseMatrix;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`File not found: ${filePath}`);
      }
      throw new Error(`Error reading matrix from file: ${error.message}`);
    }
  }

  getElement(row, col) {
    if (row < 0 || row >= this.numRows || col < 0 || col >= this.numCols) {
      throw new Error(`Index out of bounds: (${row}, ${col})`);
    }
    return this.elements.get(row)?.get(col) || 0;
  }

  setElement(row, col, value) {
    if (row < 0 || row >= this.numRows || col < 0 || col >= this.numCols) {
      throw new Error(`Index out of bounds: (${row}, ${col})`);
    }
    
    if (value === 0) {
      if (this.elements.has(row)) {
        this.elements.get(row).delete(col);
        if (this.elements.get(row).size === 0) {
          this.elements.delete(row);
        }
      }
    } else {
      if (!this.elements.has(row)) {
        this.elements.set(row, new Map());
      }
      this.elements.get(row).set(col, value);
    }
  }

  add(otherMatrix) {
    this._validateDimensions(otherMatrix, "addition");
    
    const resultMatrix = new SparseMatrix(this.numRows, this.numCols);
    
    this._copyElementsTo(resultMatrix);
    
    for (const [row, colValues] of otherMatrix.elements) {
      for (const [col, val] of colValues) {
        const currentVal = resultMatrix.getElement(row, col);
        resultMatrix.setElement(row, col, currentVal + val);
      }
    }
    
    return resultMatrix;
  }

  subtract(otherMatrix) {
    this._validateDimensions(otherMatrix, "subtraction");
    
    const resultMatrix = new SparseMatrix(this.numRows, this.numCols);
    
    this._copyElementsTo(resultMatrix);
    
    for (const [row, colValues] of otherMatrix.elements) {
      for (const [col, val] of colValues) {
        const currentVal = resultMatrix.getElement(row, col);
        resultMatrix.setElement(row, col, currentVal - val);
      }
    }
    
    return resultMatrix;
  }

  transpose() {
    const result = new SparseMatrix(this.numCols, this.numRows);
    
    for (const [row, colValues] of this.elements) {
      for (const [col, val] of colValues) {
        result.setElement(col, row, val);
      }
    }
    
    return result;
  }

  multiply(otherMatrix) {
    if (this.numCols !== otherMatrix.numRows) {
      throw new Error(`Invalid dimensions for multiplication: (${this.numRows}×${this.numCols}) and (${otherMatrix.numRows}×${otherMatrix.numCols})`);
    }
    
    const resultMatrix = new SparseMatrix(this.numRows, otherMatrix.numCols);
    
    for (const [rowA, colValuesA] of this.elements) {
      for (const [colA, valA] of colValuesA) {
        if (!otherMatrix.elements.has(colA)) continue;
        
        for (const [colB, valB] of otherMatrix.elements.get(colA)) {
          const currentVal = resultMatrix.getElement(rowA, colB);
          resultMatrix.setElement(rowA, colB, currentVal + valA * valB);
        }
      }
    }
    
    return resultMatrix;
  }

  toString() {
    let output = `rows=${this.numRows}\ncols=${this.numCols}\n`;
    
    const sortedRows = [...this.elements.keys()].sort((a, b) => a - b);
    
    for (const row of sortedRows) {
      const sortedCols = [...this.elements.get(row).keys()].sort((a, b) => a - b);
      
      for (const col of sortedCols) {
        const val = this.elements.get(row).get(col);
        output += `(${row}, ${col}, ${val})\n`;
      }
    }
    
    return output;
  }

  _validateDimensions(otherMatrix, operation) {
    if (this.numRows !== otherMatrix.numRows || this.numCols !== otherMatrix.numCols) {
      throw new Error(`Matrix dimensions must match for ${operation}: (${this.numRows}×${this.numCols}) and (${otherMatrix.numRows}×${otherMatrix.numCols})`);
    }
  }

  _copyElementsTo(targetMatrix) {
    for (const [row, colValues] of this.elements) {
      for (const [col, val] of colValues) {
        targetMatrix.setElement(row, col, val);
      }
    }
  }
}

async function main() {
  try {
    if (process.argv.length < 6) {
      console.error("Usage: node script.js <operation> <matrix1.txt> <matrix2.txt> <result.txt>");
      console.error("  operation: add, subtract, or multiply");
      process.exit(1);
    }

    const operation = process.argv[2].toLowerCase();
    const matrix1Path = process.argv[3];
    const matrix2Path = process.argv[4];
    const outputPath = process.argv[5];
    
    const validOperations = ['add', 'subtract', 'multiply'];
    if (!validOperations.includes(operation)) {
      throw new Error(`Invalid operation: '${operation}'. Use: ${validOperations.join(', ')}`);
    }

    console.log(`Loading matrix 1 from ${matrix1Path}...`);
    const matrix1 = await SparseMatrix.fromFile(matrix1Path);
    console.log(`Matrix 1 loaded: ${matrix1.numRows}×${matrix1.numCols} with ${countNonZeroElements(matrix1)} non-zero elements`);
    
    console.log(`Loading matrix 2 from ${matrix2Path}...`);
    const matrix2 = await SparseMatrix.fromFile(matrix2Path);
    console.log(`Matrix 2 loaded: ${matrix2.numRows}×${matrix2.numCols} with ${countNonZeroElements(matrix2)} non-zero elements`);

    console.log(`Performing ${operation} operation...`);
    let resultMatrix;
    
    switch (operation) {
      case 'add':
        resultMatrix = matrix1.add(matrix2);
        break;
      case 'subtract':
        resultMatrix = matrix1.subtract(matrix2);
        break;
      case 'multiply':
        if (matrix1.numCols !== matrix2.numRows) {
          if (matrix1.numCols === matrix2.numCols && matrix1.numRows === matrix2.numRows) {
            console.log("Transposing second matrix to make multiplication possible...");
            const transposedMatrix2 = matrix2.transpose();
            resultMatrix = matrix1.multiply(transposedMatrix2);
          } else {
            throw new Error(`Cannot multiply matrices with dimensions: (${matrix1.numRows}×${matrix1.numCols}) and (${matrix2.numRows}×${matrix2.numCols})`);
          }
        } else {
          resultMatrix = matrix1.multiply(matrix2);
        }
        break;
    }

    console.log(`Writing result to ${outputPath}...`);
    await fs.promises.writeFile(outputPath, resultMatrix.toString());
    
    console.log(`Operation completed successfully!`);
    console.log(`Matrix dimensions: (${matrix1.numRows}×${matrix1.numCols}) ${operation} (${matrix2.numRows}×${matrix2.numCols}) = (${resultMatrix.numRows}×${resultMatrix.numCols})`);
    console.log(`Non-zero elements in result: ${countNonZeroElements(resultMatrix)}`);
    
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  }
}
function countNonZeroElements(matrix) {
  let count = 0;
  for (const colValues of matrix.elements.values()) {
    count += colValues.size;
  }
  return count;
}

await main();
