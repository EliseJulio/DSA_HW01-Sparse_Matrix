const fs = require("fs");

// Function to read a sparse matrix from a file
function readSparseMatrix(filename) {
    const data = fs.readFileSync(filename, "utf8").split("\n");
    const matrix = new Map();

    for (const line of data) {
        if (line.trim() === "") continue;
        const match = line.match(/\((\d+),\s*(\d+),\s*([-]?\d+)\)/);
        if (match) {
            const [, r, c, v] = match.map(Number);
            const key = `${r},${c}`;
            matrix.set(key, (matrix.get(key) || 0) + v);
        }
    }

    return matrix;
}

// Function to add two sparse matrices
function addSparseMatrices(matrixA, matrixB) {
    const resultMatrix = new Map(matrixA);

    for (const [key, value] of matrixB.entries()) {
        resultMatrix.set(key, (resultMatrix.get(key) || 0) + value);
    }

    return resultMatrix;
}

// Function to write the sparse matrix to a file
function writeSparseMatrix(filename, sparseMatrix) {
    const output = [];

    for (const [key, value] of sparseMatrix.entries()) {
        const [r, c] = key.split(",").map(Number);
        if (value !== 0) output.push(`(${r}, ${c}, ${value})`);
    }

    fs.writeFileSync(filename, output.join("\n"), "utf8");
}

// Main Execution
const matrixA = readSparseMatrix('easy_sample_03_1.txt');
const matrixB = readSparseMatrix('easy_sample_03_2.txt');
const resultMatrix = addSparseMatrices(matrixA, matrixB);
writeSparseMatrix('result.txt', resultMatrix);
console.log("Sparse matrix addition completed. Check result.txt.");
