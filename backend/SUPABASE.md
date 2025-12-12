# Supabase (server) setup

This project uses Supabase Postgres and a server-side service role key for privileged operations (migrations, attachments, admin tasks).

1. Set environment variables for local development (PowerShell):

   $env:SUPABASE_URL = 'https://your-project-ref.supabase.co'
   $env:SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'

2. Example usage in server code:

   const supabase = require('./utils/supabase');
   // then use supabase.from('table').select(...) etc.

3. Security note: never commit your service role key to source control. Rotate the key if it was exposed.
