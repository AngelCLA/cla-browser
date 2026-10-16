; SHELL_CONTEXT follows electron-builder's SetShellVarContext (HKCU or HKLM).
; This include is NSIS-only: portable launches never register associations.
!define CLA_CLIENT "Software\Clients\StartMenuInternet\CLA Browser"
!define CLA_CAPABILITIES "${CLA_CLIENT}\Capabilities"

!macro CLA_InstallProgId PROGID DESCRIPTION
  WriteRegStr SHELL_CONTEXT "Software\Classes\${PROGID}" "" "${DESCRIPTION}"
  WriteRegStr SHELL_CONTEXT "Software\Classes\${PROGID}\DefaultIcon" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}",0'
  WriteRegStr SHELL_CONTEXT "Software\Classes\${PROGID}\shell\open\command" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" "%1"'
!macroend

!macro customInstall
  WriteRegStr SHELL_CONTEXT "${CLA_CLIENT}" "" "CLA Browser"
  WriteRegStr SHELL_CONTEXT "${CLA_CLIENT}" "InstallPath" "$INSTDIR"
  WriteRegStr SHELL_CONTEXT "${CLA_CLIENT}\DefaultIcon" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}",0'
  WriteRegStr SHELL_CONTEXT "${CLA_CLIENT}\shell\open\command" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}"'
  WriteRegStr SHELL_CONTEXT "${CLA_CAPABILITIES}" "ApplicationName" "CLA Browser"
  WriteRegStr SHELL_CONTEXT "${CLA_CAPABILITIES}" "ApplicationDescription" "Browse the web with CLA Browser."
  WriteRegStr SHELL_CONTEXT "${CLA_CAPABILITIES}" "ApplicationIcon" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}",0'
  WriteRegStr SHELL_CONTEXT "${CLA_CAPABILITIES}\FileAssociations" ".htm" "CLA Browser.HTML"
  WriteRegStr SHELL_CONTEXT "${CLA_CAPABILITIES}\FileAssociations" ".html" "CLA Browser.HTML"
  WriteRegStr SHELL_CONTEXT "${CLA_CAPABILITIES}\URLAssociations" "http" "CLA Browser.URL"
  WriteRegStr SHELL_CONTEXT "${CLA_CAPABILITIES}\URLAssociations" "https" "CLA Browser.URL"
  WriteRegStr SHELL_CONTEXT "Software\RegisteredApplications" "CLA Browser" "${CLA_CAPABILITIES}"
  !insertmacro CLA_InstallProgId "CLA Browser.HTML" "CLA Browser HTML Document"
  !insertmacro CLA_InstallProgId "CLA Browser.URL" "CLA Browser URL"
  WriteRegStr SHELL_CONTEXT "Software\Classes\CLA Browser.URL" "URL Protocol" ""
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend

!macro customUnInstall
  Push $0
  Push $1
  ; Another installation may have taken ownership since this one was installed.
  ReadRegStr $0 SHELL_CONTEXT "${CLA_CLIENT}" "InstallPath"
  ${If} $0 == "$INSTDIR"
    ReadRegStr $1 SHELL_CONTEXT "Software\RegisteredApplications" "CLA Browser"
    ${If} $1 == "${CLA_CAPABILITIES}"
      DeleteRegValue SHELL_CONTEXT "Software\RegisteredApplications" "CLA Browser"
    ${EndIf}
    DeleteRegKey SHELL_CONTEXT "${CLA_CLIENT}"
  ${EndIf}
  ; Guard each ProgID independently, including partially replaced registrations.
  ReadRegStr $0 SHELL_CONTEXT "Software\Classes\CLA Browser.HTML\shell\open\command" ""
  ${If} $0 == '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" "%1"'
    DeleteRegKey SHELL_CONTEXT "Software\Classes\CLA Browser.HTML"
  ${EndIf}
  ReadRegStr $0 SHELL_CONTEXT "Software\Classes\CLA Browser.URL\shell\open\command" ""
  ${If} $0 == '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" "%1"'
    DeleteRegKey SHELL_CONTEXT "Software\Classes\CLA Browser.URL"
  ${EndIf}
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
  Pop $1
  Pop $0
!macroend
