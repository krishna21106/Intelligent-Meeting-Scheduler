Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\hasen\OneDrive\Desktop\Network management system"
WshShell.Run "java -XX:+UseG1GC -Xmx1024m -jar ""C:\Users\hasen\OneDrive\Desktop\Network management system\backend\target\cnip-network-manager-1.0.0.jar""", 0, False
