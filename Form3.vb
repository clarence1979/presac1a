Public Class Form3
    Private Sub Button1_Click(sender As Object, e As EventArgs) Handles Button1.Click

        'Prompt for search entries


        MsgBox("Loading file")

        'Open the database
        Dim sr As New System.IO.StreamReader("C:\presac1\shopdata.csv")
        Dim linesInFile As Integer = 1
        Dim x As Integer = 0
        Dim textbook, subject, seller, pprice, sprice, purchaser, rating As String
        'Label10.Text = x

        Do Until sr.EndOfStream = True
            linesInFile = linesInFile + 1
            'label2 is the entire line
            Label2.Text = sr.ReadLine & vbNewLine
            'the test array splits the label2 into array items seperated by a comma
            Dim testArray() As String = Split(Label2.Text, Delimiter:=",")
            For number As Integer = 0 To testArray.Length Step 1
                textbook = testArray(0) ' textbook name
                subject = testArray(1) ' subject name
                seller = testArray(2)
                pprice = testArray(3)
                purchaser = testArray(4)
                sprice = testArray(5)
                rating = testArray(6)
            Next

            MsgBox("Let's find our entry")

            Dim textbooktofind, purchasertofind As String
            textbooktofind = InputBox("What is the Name of the book?")
            purchasertofind = InputBox("What is the first name Of the purchaser?")

            'Search for stuff
            Dim result1 As String() = Array.FindAll(testArray, Function(s) s.Contains(textbooktofind))
            Dim result2 As String() = Array.FindAll(testArray, Function(s) s.Contains(purchasertofind))

            'MsgBox(result1)
            'MsgBox(result2)

            'If result1.
            'MsgBox(result1) 'Then
            'MsgBox(result2)


            'Label2.Text = testArray(0)
            'Label7.Text = testArray(3)
            'Label8.Text = testArray(5)
            'Label4.Text = Val(testArray(5)) - Val(testArray(3))
            'Label10.Text = Val(Label10.Text) + Val(Label4.Text)
            MsgBox("Next?", vbOK)

        Loop
    End Sub
End Class