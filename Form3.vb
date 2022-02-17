Public Class Form3
    Private Sub Button1_Click(sender As Object, e As EventArgs) Handles Button1.Click

        'Prompt for search entries
        Dim a, b, c As String
        a = InputBox("What is the Name of the book?")
        b = InputBox("What is the first name Of the purchaser?")
        c = InputBox("What is the surname Of the purchaser?")

        'Open the database
        Dim sr As New System.IO.StreamReader("C:\presac1\shopdata.csv")
        Dim linesInFile As Integer = 1
        Dim x As Integer = 0
        'Label10.Text = x

        Do Until sr.EndOfStream = True
            linesInFile = linesInFile + 1
            'label2 is the entire line
            Label2.Text = sr.ReadLine & vbNewLine
            'the test array splits the label2 into array items seperated by a comma
            Dim testArray() As String = Split(Label2.Text, Delimiter:=",")
            'Search for stuff
            Dim result1 As String = Array.Find(testArray, Function(s) s = a)
            Dim result2 As String = Array.Find(testArray, Function(s) s = b)
            Dim result3 As String = Array.Find(testArray, Function(s) s = c)

            'Label2.Text = testArray(0)
            'Label7.Text = testArray(3)
            'Label8.Text = testArray(5)
            'Label4.Text = Val(testArray(5)) - Val(testArray(3))
            'Label10.Text = Val(Label10.Text) + Val(Label4.Text)
            MsgBox("Next?", vbOK)

        Loop
    End Sub
End Class