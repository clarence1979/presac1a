Public Class Form4
    Dim bigarray(100, 200) As String 'declare array large enough for dataset
    Dim icount As Integer
    Dim linesInFile As Integer = 0
    Dim columns As Integer
    Dim sr As New System.IO.StreamReader("C:\presac1\shopdata.csv")
    Dim x, y, z As Integer
    Dim a, b, c As String
    Private Sub Button1_Click(sender As Object, e As EventArgs) Handles Button1.Click
        'Prompt for search entries
        MsgBox("Loading file")
        '(columns, rows)

        'Load the whole database into a 2 dimension array - bigarray
        Do Until SR.EndOfStream = True

            linesInFile = linesInFile + 1 ' indicates the number of rows, j

            Label2.Text = SR.ReadLine & vbNewLine
            'the test array splits the label2 into array items seperated by a comma
            Dim testArray() As String = Split(Label2.Text, Delimiter:=",")
            'MsgBox(testArray.Length) ' 7 columns in 1 row. testArray.length=7

            For columns = 0 To (testArray.Length - 1)
                bigarray(columns, linesInFile) = testArray(columns)
            Next
        Loop
        x = columns
        y = linesInFile

        z = InputBox("Enter 1 for subject, 2 for textbook, 3 for rating or 4 to quit:")
        If z = 1 Then
            a = InputBox("What is the subject name for the filter?")
            'Dim newArr As String() = Array.FindAll(bigarray, AddressOf z! = bigarray)

        ElseIf z = 2 Then
            b = InputBox("What is the textbook name for the filter?")
        ElseIf z = 3 Then
            c = MsgBox("Displaying all entries sorted by rating in ascending order")
        ElseIf z = 4 Then
            End
        Else
            MsgBox("Invalid Entry")


        End If
    End Sub
End Class