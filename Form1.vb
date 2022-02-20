Public Class Form1

    Private Sub btnCalculate_Click(sender As Object, e As EventArgs) Handles btnCalculate.Click
        Dim a, b, z As Double
        Dim c As Boolean
        a = Val(txtoriginal_price.Text)
        b = Val(txtAge.Text)
        z = calculate(a, b)
        lblprice.Text = z

    End Sub



    Private Sub Button1_Click(sender As Object, e As EventArgs) Handles Button1.Click
        Dim a, b, z As Double
        Dim answer As Integer

        answer = MsgBox("Do you want to repeat the program?", vbQuestion + vbYesNo + vbDefaultButton2, "Repeat?")
        a = Val(txtoriginal_price.Text)
        b = Val(txtAge.Text)

        If answer = vbYes Then
            z = calculate(a, b)
        Else
            MsgBox("Bye!")
        End If
    End Sub



    Public Function calculate(purchasedvalue, age)
        Dim x As Double
        Dim y As Double
        x = Val(age)
        If x < 1 Then
            y = 1

        ElseIf x > 1 And x <= 2 Then
            y = 0.8
        ElseIf x > 2 And x <= 3 Then
            y = 0.6
        ElseIf x > 3 And x <= 4 Then
            y = 0.4
        ElseIf x > 4 And x <= 5 Then
            y = 0.2
        Else
            y = 0
        End If
        Return purchasedvalue * y
    End Function

    Private Sub btnadd_database_Click(sender As Object, e As EventArgs) Handles btnadd_database.Click
        'This is how an entry gets written in a CSV file
        Dim file As System.IO.StreamWriter
        file = My.Computer.FileSystem.OpenTextFileWriter("c:\myfolder\Test.csv", True)
        file.WriteLine(lblprice.Text)
        file.Close()

    End Sub

    Private Sub Button2_Click(sender As Object, e As EventArgs) Handles Button2.Click
        Me.Hide()
        Form2.Show()
        'Module1.main()
    End Sub

    Private Sub Button3_Click(sender As Object, e As EventArgs) Handles Button3.Click
        Me.Hide()
        Form3.Show()
    End Sub

    Private Sub Button4_Click(sender As Object, e As EventArgs) Handles Button4.Click
        Me.Hide()
        Form4.Show()
    End Sub
End Class
