$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
node "$scriptDir\kiki.js" @args
