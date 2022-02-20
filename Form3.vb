Public Class Form3
    Dim bigarray(100, 200) As String 'declare array large enough for dataset
    Dim icount As Integer
    Dim linesInFile As Integer = 0
    Dim columns As Integer
    Dim sr As New System.IO.StreamReader("C:\presac1\shopdata.csv")
    Dim x, y As Integer
    Private Sub Button1_Click(sender As Object, e As EventArgs) Handles Button1.Click

        'Prompt for search entries
        MsgBox("Loading file")
        '(columns, rows)

        'Load the whole database into a 2 dimension array - bigarray
        Do Until sr.EndOfStream = True

            linesInFile = linesInFile + 1 ' indicates the number of rows, j

            Label2.Text = sr.ReadLine & vbNewLine
            'the test array splits the label2 into array items seperated by a comma
            Dim testArray() As String = Split(Label2.Text, Delimiter:=",")
            'MsgBox(testArray.Length) ' 7 columns in 1 row. testArray.length=7

            For columns = 0 To (testArray.Length - 1)
                bigarray(columns, linesInFile) = testArray(columns)
            Next
        Loop
        x = columns
        y = linesInFile
        'Test if data sucessfully saved
        'MsgBox(bigarray(0, 2)) ' understanding silicon life
        'MsgBox(bigarray(0, 1)) ' This is the title row (not data)
        MsgBox("Let's find our entry")

        Dim textbooktofind, purchasertofind As String
        textbooktofind = InputBox("What is the Name of the book?")
        purchasertofind = InputBox("What is the first name Of the purchaser?")


        Dim bfound As Boolean

        MsgBox(linesInFile)
        For icount = 2 To linesInFile
            If bigarray(0, icount) = textbooktofind And bigarray(4, icount) = purchasertofind Then
                bfound = True
                MsgBox("Book found!")
                lblTitle.Text = bigarray(0, icount)
                lblSubject.Text = bigarray(1, icount)
                lblSeller.Text = bigarray(2, icount)
                lblPPrice.Text = bigarray(3, icount)
                lblPurchaser.Text = bigarray(4, icount)
                lblSalePrice.Text = bigarray(5, icount)
                lblRating.Text = bigarray(6, icount)

                MsgBox("Click button on right to rate book")

                Button2.Enabled = True
                'rate the book

            Else
                MsgBox("Book not found!")
                Exit For
            End If

        Next

    End Sub


    Private Sub Form3_Load(sender As Object, e As EventArgs) Handles MyBase.Load
        Button2.Enabled = False
        Button3.Enabled = False
        RadioButton1.Enabled = False
        RadioButton2.Enabled = False
        RadioButton3.Enabled = False
        RadioButton4.Enabled = False
        RadioButton5.Enabled = False
        RadioButton6.Enabled = False
    End Sub

    Private Sub Button2_Click(sender As Object, e As EventArgs) Handles Button2.Click
        MsgBox("Enter a new rating for the book on the right!")
        RadioButton1.Enabled = True
        RadioButton2.Enabled = True
        RadioButton3.Enabled = True
        RadioButton4.Enabled = True
        RadioButton5.Enabled = True
        RadioButton6.Enabled = True

    End Sub

    Private Sub RadioButton1_CheckedChanged(sender As Object, e As EventArgs) Handles RadioButton1.CheckedChanged
        If RadioButton1.Checked = True Then ' NA Rating
            bigarray(6, icount) = "NA"
        Else
            bigarray(6, icount) = "-"
        End If
        lblRating.Text = bigarray(6, icount)
        MsgBox(bigarray(6, icount))
        Button3.Enabled = True
    End Sub

    Private Sub RadioButton2_CheckedChanged(sender As Object, e As EventArgs) Handles RadioButton2.CheckedChanged
        If RadioButton2.Checked = True Then
            bigarray(6, icount) = "1"
        Else
            bigarray(6, icount) = "-"
        End If
        lblRating.Text = bigarray(6, icount)
        MsgBox(bigarray(6, icount))
        Button3.Enabled = True
    End Sub

    Private Sub RadioButton3_CheckedChanged(sender As Object, e As EventArgs) Handles RadioButton3.CheckedChanged
        If RadioButton3.Checked = True Then
            bigarray(6, icount) = "2"
        Else
            bigarray(6, icount) = "-"
        End If
        lblRating.Text = bigarray(6, icount)
        MsgBox(bigarray(6, icount))
        Button3.Enabled = True
    End Sub

    Private Sub RadioButton4_CheckedChanged(sender As Object, e As EventArgs) Handles RadioButton4.CheckedChanged
        If RadioButton4.Checked = True Then
            bigarray(6, icount) = "3"
        Else
            bigarray(6, icount) = "-"
        End If
        lblRating.Text = bigarray(6, icount)
        MsgBox(bigarray(6, icount))
        Button3.Enabled = True
    End Sub

    Private Sub RadioButton5_CheckedChanged(sender As Object, e As EventArgs) Handles RadioButton5.CheckedChanged
        If RadioButton5.Checked = True Then
            bigarray(6, icount) = "4"
        Else
            bigarray(6, icount) = "-"
        End If
        lblRating.Text = bigarray(6, icount)
        MsgBox(bigarray(6, icount))
        Button3.Enabled = True
    End Sub

    Private Sub RadioButton6_CheckedChanged(sender As Object, e As EventArgs) Handles RadioButton6.CheckedChanged
        If RadioButton6.Checked = True Then
            bigarray(6, icount) = "5"
        Else
            bigarray(6, icount) = "-"
        End If
        lblRating.Text = bigarray(6, icount)
        MsgBox(bigarray(6, icount))
        Button3.Enabled = True
    End Sub

    Private Sub Button3_Click(sender As Object, e As EventArgs) Handles Button3.Click
        'this code will save the entire array in a new CSV file
        Dim file As System.IO.StreamWriter
        file = My.Computer.FileSystem.OpenTextFileWriter("C:\presac1\newfile.csv", True)

        For linesInFile = 0 To (y - 1)
            For columns = 0 To (x - 1)
                file.Write(bigarray(columns, linesInFile) + ",")
            Next

        Next

        file.Close()

    End Sub
End Class