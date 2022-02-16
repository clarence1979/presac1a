Public Class Form2
    Private Sub Button1_Click(sender As Object, e As EventArgs) Handles Button1.Click
        Dim file As System.IO.StreamReader
        ' file = My.Computer.FileSystem.OpenTextFileReader("c:\myfolder\Test.csv", False)
        'file.WriteLine(lblprice.Text)
        file.Close()
    End Sub
End Class