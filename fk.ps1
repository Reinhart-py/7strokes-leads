$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
node "$scriptDir\fk.js" @args
