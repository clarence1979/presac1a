Public Class Form3
    Dim bigarray(100, 200) As String 'declare array large enough for dataset
    Dim icount As Integer
    Private Sub Button1_Click(sender As Object, e As EventArgs) Handles Button1.Click

        'Prompt for search entries
        MsgBox("Loading file")

        'Open the database
        Dim sr As New System.IO.StreamReader("C:\presac1\shopdata.csv")

        '(columns, rows)
        Dim linesInFile As Integer = 0
        Dim columns As Integer

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
                'write this into new CSV file




            Else
                MsgBox("Book not found!")
                Exit For
            End If

        Next




    End Sub

    Sub TwoDArrayToCSV(ByVal DataArray(,) As String)
        Dim str As String = ""
        Dim ofile As String = ""

        svDialog("csv|*.csv", "save as...", ofile)
        Dim sw As System.IO.StreamWriter = New System.IO.StreamWriter(ofile)

        For i As Int32 = DataArray.GetLowerBound(0) To DataArray.GetUpperBound(0)
            For j As Int32 = DataArray.GetLowerBound(1) To DataArray.GetUpperBound(1)
                str += DataArray(i, j) + ","
            Next
            sw.WriteLine(str)
            str = ""
        Next
        sw.Flush()
        sw.Close()
    End Sub

    Sub svDialog(ByVal infilter As String, ByVal dtitle As String, ByRef outfile As String)
        Dim openFileDialog1 As New SaveFileDialog()
        With openFileDialog1
            .Filter = infilter
            .FilterIndex = 1
            .Title = dtitle
            .DefaultExt = Strings.Right(infilter, 3)
            .ShowDialog()
            outfile = openFileDialog1.FileName
            .RestoreDirectory = True
        End With
    End Sub
    Private Sub Form3_Load(sender As Object, e As EventArgs) Handles MyBase.Load

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

        If RadioButton1.Checked = True Then ' NA Rating
            bigarray(6, icount) = "NA"
        ElseIf RadioButton2.Checked = True Then
            bigarray(6, icount) = "1"
        ElseIf RadioButton3.Checked = True Then
            bigarray(6, icount) = "2"
        ElseIf RadioButton4.Checked = True Then
            bigarray(6, icount) = "3"
        ElseIf RadioButton5.Checked = True Then
            bigarray(6, icount) = "4"
        ElseIf RadioButton6.Checked = True Then
            bigarray(6, icount) = "5"
        Else
            MsgBox("Enter rating selection!")
        End If
        lblRating.Text = bigarray(6, icount)

    End Sub



    Private Sub Button3_Click(sender As Object, e As EventArgs) Handles Button3.Click
        TwoDArrayToCSV(bigarray)
    End Sub
End Class