

Public Class Form2
    'This is the example code for section B
    Private Sub Button1_Click(sender As Object, e As EventArgs) Handles Button1.Click
        Dim sr As New System.IO.StreamReader("C:\presac1\shopdata.csv")
        Dim linesInFile As Integer = 1
        Dim x As Integer = 0
        Label10.Text = x

        Do Until sr.EndOfStream = True
            linesInFile = linesInFile + 1
            Label11.Text = sr.ReadLine & vbNewLine
            Dim testArray() As String = Split(Label11.Text, Delimiter:=",")
            Label2.Text = testArray(0)
            Label7.Text = testArray(3)
            Label8.Text = testArray(5)
            Label4.Text = Val(testArray(5)) - Val(testArray(3))
            Label10.Text = Val(Label10.Text) + Val(Label4.Text)
            MsgBox("Next?", vbOK)

        Loop
    End Sub
End Class