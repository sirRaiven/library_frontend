export default defineNuxtRouteMiddleware((to, from) => {
  // In a real application, you would fetch this from a state management tool (Pinia) or a Cookie (useCookie)
  const userRole = useCookie("user-role").value; // Example: 'librarian', 'student', or null
  const isAuthenticated = !!userRole;

  // 1. Allow public access to the login page
  if (to.path === "/") {
    // If already logged in, redirect them to their respective dashboard
    if (userRole === "librarian") return navigateTo("/librarian/dashboard");
    if (userRole === "student") return navigateTo("/student/dashboard");
    return; // Allow access to login
  }

  // 2. Prevent unauthenticated access to protected routes
  if (!isAuthenticated) {
    return navigateTo("/");
  }

  // 3. Role-Based Route Guards
  if (to.path.startsWith("/librarian") && userRole !== "librarian") {
    // A student trying to access librarian pages gets booted to their dashboard (or login)
    return navigateTo(userRole === "student" ? "/student/dashboard" : "/");
  }

  if (to.path.startsWith("/student") && userRole !== "student") {
    return navigateTo(userRole === "librarian" ? "/librarian/dashboard" : "/");
  }
});
