<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()> _
Partial Class Form1
    Inherits System.Windows.Forms.Form

    'Form overrides dispose to clean up the component list.
    <System.Diagnostics.DebuggerNonUserCode()> _
    Protected Overrides Sub Dispose(ByVal disposing As Boolean)
        Try
            If disposing AndAlso components IsNot Nothing Then
                components.Dispose()
            End If
        Finally
            MyBase.Dispose(disposing)
        End Try
    End Sub

    'Required by the Windows Form Designer
    Private components As System.ComponentModel.IContainer

    'NOTE: The following procedure is required by the Windows Form Designer
    'It can be modified using the Windows Form Designer.  
    'Do not modify it using the code editor.
    <System.Diagnostics.DebuggerStepThrough()> _
    Private Sub InitializeComponent()
        Me.lblins1 = New System.Windows.Forms.Label()
        Me.lblins2 = New System.Windows.Forms.Label()
        Me.lblprice = New System.Windows.Forms.Label()
        Me.txtAge = New System.Windows.Forms.TextBox()
        Me.txtoriginal_price = New System.Windows.Forms.TextBox()
        Me.btnCalculate = New System.Windows.Forms.Button()
        Me.btnadd_database = New System.Windows.Forms.Button()
        Me.Button1 = New System.Windows.Forms.Button()
        Me.Button2 = New System.Windows.Forms.Button()
        Me.SuspendLayout()
        '
        'lblins1
        '
        Me.lblins1.AutoSize = True
        Me.lblins1.Font = New System.Drawing.Font("Microsoft Sans Serif", 15.75!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.lblins1.Location = New System.Drawing.Point(40, 33)
        Me.lblins1.Margin = New System.Windows.Forms.Padding(2, 0, 2, 0)
        Me.lblins1.Name = "lblins1"
        Me.lblins1.Size = New System.Drawing.Size(334, 25)
        Me.lblins1.TabIndex = 0
        Me.lblins1.Text = "What is the age of your textbook?"
        '
        'lblins2
        '
        Me.lblins2.AutoSize = True
        Me.lblins2.Font = New System.Drawing.Font("Microsoft Sans Serif", 15.75!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.lblins2.Location = New System.Drawing.Point(40, 75)
        Me.lblins2.Margin = New System.Windows.Forms.Padding(2, 0, 2, 0)
        Me.lblins2.Name = "lblins2"
        Me.lblins2.Size = New System.Drawing.Size(261, 25)
        Me.lblins2.TabIndex = 1
        Me.lblins2.Text = "What is the original price?"
        '
        'lblprice
        '
        Me.lblprice.AutoSize = True
        Me.lblprice.Font = New System.Drawing.Font("Microsoft Sans Serif", 15.75!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.lblprice.Location = New System.Drawing.Point(297, 138)
        Me.lblprice.Margin = New System.Windows.Forms.Padding(2, 0, 2, 0)
        Me.lblprice.Name = "lblprice"
        Me.lblprice.Size = New System.Drawing.Size(77, 25)
        Me.lblprice.TabIndex = 2
        Me.lblprice.Text = "Label3"
        '
        'txtAge
        '
        Me.txtAge.Font = New System.Drawing.Font("Microsoft Sans Serif", 15.75!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.txtAge.Location = New System.Drawing.Point(446, 33)
        Me.txtAge.Margin = New System.Windows.Forms.Padding(2)
        Me.txtAge.Name = "txtAge"
        Me.txtAge.Size = New System.Drawing.Size(52, 31)
        Me.txtAge.TabIndex = 3
        '
        'txtoriginal_price
        '
        Me.txtoriginal_price.Font = New System.Drawing.Font("Microsoft Sans Serif", 15.75!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.txtoriginal_price.Location = New System.Drawing.Point(446, 81)
        Me.txtoriginal_price.Margin = New System.Windows.Forms.Padding(2)
        Me.txtoriginal_price.Name = "txtoriginal_price"
        Me.txtoriginal_price.Size = New System.Drawing.Size(52, 31)
        Me.txtoriginal_price.TabIndex = 4
        '
        'btnCalculate
        '
        Me.btnCalculate.Font = New System.Drawing.Font("Microsoft Sans Serif", 15.75!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.btnCalculate.Location = New System.Drawing.Point(42, 125)
        Me.btnCalculate.Margin = New System.Windows.Forms.Padding(2)
        Me.btnCalculate.Name = "btnCalculate"
        Me.btnCalculate.Size = New System.Drawing.Size(251, 90)
        Me.btnCalculate.TabIndex = 5
        Me.btnCalculate.Text = "Calculate"
        Me.btnCalculate.UseVisualStyleBackColor = True
        '
        'btnadd_database
        '
        Me.btnadd_database.Font = New System.Drawing.Font("Microsoft Sans Serif", 15.75!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.btnadd_database.Location = New System.Drawing.Point(420, 138)
        Me.btnadd_database.Margin = New System.Windows.Forms.Padding(2)
        Me.btnadd_database.Name = "btnadd_database"
        Me.btnadd_database.Size = New System.Drawing.Size(281, 77)
        Me.btnadd_database.TabIndex = 6
        Me.btnadd_database.Text = "Add to Database"
        Me.btnadd_database.UseVisualStyleBackColor = True
        '
        'Button1
        '
        Me.Button1.Font = New System.Drawing.Font("Microsoft Sans Serif", 15.75!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Button1.Location = New System.Drawing.Point(234, 237)
        Me.Button1.Name = "Button1"
        Me.Button1.Size = New System.Drawing.Size(250, 80)
        Me.Button1.TabIndex = 7
        Me.Button1.Text = "Repeat Program?"
        Me.Button1.UseVisualStyleBackColor = True
        '
        'Button2
        '
        Me.Button2.Font = New System.Drawing.Font("Microsoft Sans Serif", 26.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Button2.Location = New System.Drawing.Point(533, 237)
        Me.Button2.Name = "Button2"
        Me.Button2.Size = New System.Drawing.Size(286, 80)
        Me.Button2.TabIndex = 8
        Me.Button2.Text = "Task 2"
        Me.Button2.UseVisualStyleBackColor = True
        '
        'Form1
        '
        Me.AutoScaleDimensions = New System.Drawing.SizeF(6.0!, 13.0!)
        Me.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font
        Me.ClientSize = New System.Drawing.Size(1127, 534)
        Me.Controls.Add(Me.Button2)
        Me.Controls.Add(Me.Button1)
        Me.Controls.Add(Me.btnadd_database)
        Me.Controls.Add(Me.btnCalculate)
        Me.Controls.Add(Me.txtoriginal_price)
        Me.Controls.Add(Me.txtAge)
        Me.Controls.Add(Me.lblprice)
        Me.Controls.Add(Me.lblins2)
        Me.Controls.Add(Me.lblins1)
        Me.Margin = New System.Windows.Forms.Padding(2)
        Me.Name = "Form1"
        Me.Text = "Textbook Price Calculation"
        Me.ResumeLayout(False)
        Me.PerformLayout()

    End Sub

    Friend WithEvents lblins1 As Label
    Friend WithEvents lblins2 As Label
    Friend WithEvents lblprice As Label
    Friend WithEvents txtAge As TextBox
    Friend WithEvents txtoriginal_price As TextBox
    Friend WithEvents btnCalculate As Button
    Friend WithEvents btnadd_database As Button
    Friend WithEvents Button1 As Button
    Friend WithEvents Button2 As Button
End Class
