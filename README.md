Sparse Matrix Operations 
This project provides implementation for performing basic operations on sparse matrices including addition, subtraction and multiplication. 
Sparse matrices are stored efficiently to optimize both memory usage and runtime.

Features Load sparse matrices from input files Perform matrix addition, subtraction and multiplication 
Handle input variations and exceptions Save the results to an output file

Example showing how it operates 
PS C:\Users\JULIO\OneDrive\Desktop\TR> node test.js subtract easy_sample_02_2.txt easy_sample_02_1.txt subtract.txt
Result written to subtract.txt
PS C:\Users\JULIO\OneDrive\Desktop\TR> node test.js add easy_sample_02_2.txt easy_sample_02_1.txt add.txt          
Result written to add.txt
PS C:\Users\JULIO\OneDrive\Desktop\TR> node test.js multiply easy_sample_02_2.txt easy_sample_02_1.txt multiply.txt
Error: Invalid dimensions for multiplication
PS C:\Users\JULIO\OneDrive\Desktop\TR> node test.js multiply easy_sample_02_2.txt easy_sample_02_3.txt multiply.txt
Result written to multiply.txt
PS C:\Users\JULIO\OneDrive\Desktop\TR> 
