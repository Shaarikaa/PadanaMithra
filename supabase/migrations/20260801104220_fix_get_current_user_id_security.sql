/*
# Fix get_current_user_id security warnings

1. Changes
   - Set search_path on get_current_user_id to prevent search path injection
   - Switch from SECURITY DEFINER to SECURITY INVOKER (the function only reads request headers, no elevated privileges needed)
2. Security
   - Fixes 3 advisor warnings: function_search_path_mutable, anon_security_definer_function_executable, authenticated_security_definer_function_executable
*/

ALTER FUNCTION get_current_user_id() SECURITY INVOKER;
ALTER FUNCTION get_current_user_id() SET search_path = public;
