Imports System.IO

Module Module1
    Sub main()


        Dim file1 As String = File.ReadAllText("C:\\presac1\shopdata.csv")
        Console.WriteLine(file1)
        Console.Read()

    End Sub
End Module