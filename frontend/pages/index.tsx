"use client";
import axios from "axios";
import React, { useEffect, useState, useRef } from "react";
import { Post, UserPost } from "../components/UserPost";
import "../app/globals.css";
import { GetStaticProps } from "next";

const NOTES_URL = "http://localhost:3001/notes";
const USERS_URL = "http://localhost:3001/users";
const POSTS_PER_PAGE = 10;

interface User {
  token: string;
  username: string;
  name: string;
  email: string;
}

interface HomeProps {
  initialNotes: Post[];
  initialTotalPages: number;
  initialTotalPosts: number;
}
export default function Home(props: HomeProps) {
  const initialRender = useRef(true);
  const [activePage, setActivePage] = useState(1);
  const [total_num_of_pages, set_total_num_of_pages] = useState(
    props.initialTotalPages
  );
  const [user_posts, set_user_posts] = useState<Post[]>(props.initialNotes);
  const [total_num_of_posts, set_total_num_of_posts] = useState(
    props.initialTotalPosts
  );
  const [new_note, set_new_note] = useState({
    title: "",
    email: "",
    content: "",
  });
  const [edit_cont, set_edit_cont] = useState("");
  const [edit_pos, set_edit_pos] = useState<number | null>(null);
  const [show_new_note, set_show_new_note] = useState(false);
  const [theme, setTheme] = useState("light");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
  });
  const [loginError, setLoginError] = useState(""); // State for error message
  const [successMessage, setSuccessMessage] = useState(""); // State for success message

  const [cache, setCache] = useState<{ [page: number]: Post[] }>({
    1: props.initialNotes,
  });

  useEffect(() => {
    fetch_notes();
  }, [activePage]);

  const fetch_notes = async () => {
    // Log the current cache keys (page numbers) before attempting to fetch new data.
    // console.log("Cache before fetching:", Object.keys(cache));

    // Check if the current page's data is already in the cache.
    if (cache[activePage]) {
      // If the data is in the cache, set the user posts to the cached data.
      set_user_posts(cache[activePage]);
      // Log that the data was loaded from the cache.
      console.log(`Page ${activePage} loaded from cache.`);
    } else {
      try {
        // Fetch the data for the current page from the server.
        const response = await axios.get(NOTES_URL, {
          params: {
            _page: activePage, // Current page number.
            _per_page: POSTS_PER_PAGE, // Number of posts per page.
          },
        });

        // Update the state with the fetched data.
        set_user_posts(response.data);

        // Update the cache with the new data for the current page.
        setCache((prevCache) => {
          // Add the current page to the cache
          const newCache = { ...prevCache, [activePage]: response.data };

          // Get visible pages for the current pagination bar
          const visiblePages = handlePagesButtons();

          // Remove pages that are not in the current visible range
          const updatedCache = Object.keys(newCache)
            .filter((page) => visiblePages.includes(Number(page)))
            .reduce((acc, page) => {
              acc[Number(page)] = newCache[Number(page)];
              return acc;
            }, {} as { [page: number]: Post[] });

          console.log("Cache updated:", Object.keys(updatedCache));
          return updatedCache;
        });
      } catch (error) {
        // Log any errors that occur during the fetching process.
        console.log("Encountered an error:", error);
      }
    }

    // Fetch additional pages that are visible in the pagination.
    const fetchAdditionalPages = async () => {
      // Get the pages that should be visible in the pagination.
      const visiblePages = handlePagesButtons();

      // Determine which pages need to be pre-fetched by filtering out pages already in the cache.
      const pagesToFetch = visiblePages.filter(
        (page) => page !== activePage && !cache[page]
      );

      console.log("Pages to pre-fetch:", pagesToFetch);

      // Loop through each page that needs to be pre-fetched.
      for (const page of pagesToFetch) {
        try {
          // Fetch the data for the page from the server.
          const response = await axios.get(NOTES_URL, {
            params: {
              _page: page, // Page number to fetch.
              _per_page: POSTS_PER_PAGE, // Number of posts per page.
            },
          });

          // Update the cache with the fetched data for the page.
          setCache((prevCache) => {
            const newCache = { ...prevCache, [page]: response.data };

            // Remove pages from cache that are not visible in the current pagination bar.
            const updatedCache = Object.keys(newCache)
              .filter((cachedPage) => visiblePages.includes(Number(cachedPage)))
              .reduce((acc, cachedPage) => {
                acc[Number(cachedPage)] = newCache[Number(cachedPage)];
                return acc;
              }, {} as { [page: number]: Post[] });

            console.log(
              "Cache updated with new page:",
              page,
              Object.keys(updatedCache)
            );
            return updatedCache;
          });
        } catch (error) {
          // Log any errors that occur during the pre-fetching process.
          console.log("Error pre-fetching page:", error);
        }
      }
    };

    // Call the function to pre-fetch additional pages
    fetchAdditionalPages();
  };

  const login = async (credentials: any) => {
    const response = await axios.post(
      "http://localhost:3001/login",
      credentials
    );
    return response.data;
  };

  const handleLogin = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    try {
      const user = await login({ username, password });
      localStorage.setItem("userToken", user.token);
      localStorage.setItem("username", username);
      localStorage.setItem("name", user.name); // Assuming the response includes the user's name
      localStorage.setItem("email", user.email); // Assuming the response includes the user's email
      setUser({
        token: user.token,
        username,
        name: user.name,
        email: user.email,
      });
      setPassword("");
      setLoginError(""); // Clear any previous error
    } catch (error) {
      console.log("Wrong credentials");
      setLoginError("Invalid username or password."); // Set the error message
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("userToken");
    localStorage.removeItem("username");
    localStorage.removeItem("name");
    localStorage.removeItem("email");
    setUser(null);
  };

  const loginForm = () => (
    <form name="login_form" onSubmit={handleLogin}>
      <div>
        Username
        <input
          type="text"
          value={username}
          data-testid="usernamelogin"
          name="login_form_username"
          onChange={({ target }) => setUsername(target.value)}
          required
        />
      </div>
      <div>
        Password
        <input
          type="password"
          value={password}
          data-testid="passwordlogin"
          name="login_form_password"
          onChange={({ target }) => setPassword(target.value)}
          required
        />
      </div>
      <button type="submit" name="login_form_login">
        Login
      </button>
      {loginError && <div style={{ color: "red" }}>{loginError}</div>}{" "}
      {/* Display the error message */}
    </form>
  );

  const createUserForm = () => (
    <form name="create_user_form" onSubmit={handleCreateUser}>
      <div>
        Name
        <input
          type="text"
          placeholder="Name"
          name="create_user_form_name"
          value={newUser.name}
          onChange={handleUserInputChange}
          required
        />
      </div>
      <div>
        Email
        <input
          type="email"
          placeholder="Email"
          name="create_user_form_email"
          value={newUser.email}
          onChange={handleUserInputChange}
          required
        />
      </div>
      <div>
        Username
        <input
          type="text"
          placeholder="Username"
          name="create_user_form_username"
          value={newUser.username}
          onChange={handleUserInputChange}
          required
        />
      </div>
      <div>
        Password
        <input
          type="password"
          placeholder="Password"
          name="create_user_form_password"
          value={newUser.password}
          onChange={handleUserInputChange}
          required
        />
      </div>
      <button type="submit" name="create_user_form_create_user">
        Create User
      </button>
    </form>
  );

  const handleCreateUser = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    try {
      const response = await axios.post(USERS_URL, newUser);
      console.log("User created:", response.data);
      setNewUser({
        name: "",
        email: "",
        username: "",
        password: "",
      });
    } catch (error) {
      console.log("Error creating user:", error);
    }
  };

  const handleUserInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = event.target;
    setNewUser((prev) => ({
      ...prev,
      [name.replace("create_user_form_", "")]: value,
    }));
  };

  const noteForm = () => (
    <div className="text-center">
      <button name="add_new_note" onClick={() => set_show_new_note(true)}>
        Add Note
      </button>
      {show_new_note && (
        <form onSubmit={addNote}>
          <div className="user-post">
            <input
              type="text"
              name="title"
              data-testid="title"
              value={new_note.title}
              onChange={handleInputChange}
              placeholder="Title"
              required
            />
            <input
              type="email"
              name="email"
              data-testid="email"
              value={user?.email || ""}
              onChange={handleInputChange}
              placeholder="Email"
              required
              disabled
            />
            <input
              type="text"
              name="content"
              data-testid="content"
              value={new_note.content}
              onChange={handleInputChange}
              placeholder="Content"
              required
            />
            <button name="text_input_save_new_note" type="submit">
              Save
            </button>
            <button
              name="text_input_cancel_new_note"
              type="button"
              onClick={() => set_show_new_note(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {successMessage && <div style={{ color: "green" }}>{successMessage}</div>}{" "}
      {/* Display the success message */}
    </div>
  );

  function switchTheme() {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  }

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
  }, [theme]);

  function handlePagesButtons() {
    switch (true) {
      case total_num_of_pages <= 5:
        return Array.from({ length: total_num_of_pages }).map((_, i) => i + 1);
      case activePage < 3:
        return [1, 2, 3, 4, 5];
      case total_num_of_pages - activePage < 2:
        return [
          total_num_of_pages - 4,
          total_num_of_pages - 3,
          total_num_of_pages - 2,
          total_num_of_pages - 1,
          total_num_of_pages,
        ];
      default:
        return [
          activePage - 2,
          activePage - 1,
          activePage,
          activePage + 1,
          activePage + 2,
        ];
    }
  }

  function handlePageClick(next_page: number) {
    setActivePage(next_page);
  }

  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
    } else {
      const fetchTotalNotes = async () => {
        try {
          const response = await axios.get(NOTES_URL + "/total");
          set_total_num_of_posts(response.data.total);
          set_total_num_of_pages(
            Math.ceil(response.data.total / POSTS_PER_PAGE)
          );
        } catch (error) {
          console.log("Encountered an error:", error);
        }
      };

      fetchTotalNotes();
    }
  }, [total_num_of_posts]);

  useEffect(() => {
    const loggedUserJSON = localStorage.getItem("userToken");
    if (loggedUserJSON) {
      const loggedUsername = localStorage.getItem("username");
      const loggedName = localStorage.getItem("name");
      const loggedEmail = localStorage.getItem("email");
      setUser({
        token: loggedUserJSON,
        username: loggedUsername || "",
        name: loggedName || "",
        email: loggedEmail || "",
      });
    }
  }, []);

  let token: string | null = null;

  const setToken = (newToken: string | null) => {
    token = `Bearer ${newToken}`;
  };

  const create = async (newObject: {
    id: number;
    title: string;
    author: { name: string; email: string };
    content: string;
  }) => {
    const token = `Bearer ${localStorage.getItem("userToken")}`;
    const config = {
      headers: { Authorization: token },
    };

    try {
      const response = await axios.post(NOTES_URL, newObject, config);
      return response.data;
    } catch (error) {
      console.error("Error creating note:", error);
      throw error;
    }
  };

  const addNote = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    const noteObject = {
      id: Math.floor(Math.random() * 100000),
      title: new_note.title,
      author: {
        name: user?.name || "",
        email: user?.email || "",
      },
      content: new_note.content,
    };

    try {
      const returnedNote = await create(noteObject);

      // Update total number of posts and pages
      const newTotalPosts = total_num_of_posts + 1;
      set_total_num_of_posts(newTotalPosts);
      const newTotalPages = Math.ceil(newTotalPosts / POSTS_PER_PAGE);
      set_total_num_of_pages(newTotalPages);

      // Navigate to the last page if a new page is created
      if (newTotalPages > total_num_of_pages) {
        setActivePage(newTotalPages);
      } else {
        await fetch_notes(); // Refresh notes for the current page
      }

      set_new_note({
        title: "",
        email: "",
        content: "",
      });
      set_show_new_note(false);
      setSuccessMessage("Note added successfully!"); // Set the success message
      setTimeout(() => setSuccessMessage(""), 3000); // Clear the success message after 3 seconds
    } catch (error) {
      console.log("Error adding note:", error);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    set_new_note((prev_note: any) => ({
      ...prev_note,
      [name]: value,
    }));
  };

  const del_note = async (position: number) => {
    try {
      await axios.delete(`http://localhost:3001/notes/${position}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("userToken")}`,
        },
      });

      // Update total number of posts and pages
      const newTotalPosts = total_num_of_posts - 1;
      set_total_num_of_posts(newTotalPosts);
      const newTotalPages = Math.ceil(newTotalPosts / POSTS_PER_PAGE);
      set_total_num_of_pages(newTotalPages);
      // Adjust active page if the current page is empty
      if (activePage > newTotalPages) {
        setActivePage(newTotalPages);
      } else {
        await fetch_notes(); // Refresh notes for the current page
      }
    } catch (error) {
      console.log("Error deleting note:", error);
    }
  };

  const sta_edit = (pos: number, content: string) => {
    set_edit_pos(pos);
    set_edit_cont(content);
  };

  const save_edit = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    if (edit_pos !== null) {
      try {
        await axios.put(
          `${NOTES_URL}/${edit_pos}`,
          { content: edit_cont },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("userToken")}`,
            },
          }
        );
        set_edit_cont("");
        set_edit_pos(null);
        await fetch_notes();
      } catch (error) {
        console.log("Error updating note:", error);
      }
    }
  };

  return (
    <div>
      <div
        className="text-center"
        style={{ fontWeight: "bold", color: "#04AA6D", fontSize: "24px" }}
      >
        NOTES
      </div>
      <div className="text-center">
        <button name="change_theme" onClick={switchTheme}>
          {theme === "light" ? "Switch to Dark Theme" : "Switch to Light Theme"}
        </button>
        {user === null ? (
          <>
            {loginForm()}
            {/* Always render create user form */}
            {createUserForm()}
          </>
        ) : (
          <div>
            <p>{user.name} logged-in</p>
            <button name="logout" onClick={handleLogout}>
              Logout
            </button>
            {noteForm()}
          </div>
        )}
      </div>
      <div className="text-center">
        {user_posts.map((current_post, index) => {
          const position = index + 1 + (activePage - 1) * POSTS_PER_PAGE;
          return (
            <div key={current_post.id}>
              {edit_pos === position ? (
                <form onSubmit={save_edit}>
                  <div>
                    <strong>Title: </strong>
                    {current_post.title}
                  </div>
                  <div>
                    <strong>Author: </strong>
                    {current_post.author.name}
                  </div>
                  <div>
                    <strong>Email: </strong>
                    {current_post.author.email}
                  </div>
                  <input
                    name={`text_input-${current_post.id}`}
                    type="text"
                    value={edit_cont}
                    onChange={(e) => set_edit_cont(e.target.value)}
                    placeholder="Edit Content"
                    required
                  />
                  <button
                    name={`text_input_save-${current_post.id}`}
                    type="submit"
                  >
                    Save
                  </button>
                  <button
                    name={`text_input_cancel-${current_post.id}`}
                    type="button"
                    onClick={() => set_edit_pos(null)}
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <div>
                  <UserPost
                    id={current_post.id}
                    title={current_post.title}
                    author={current_post.author}
                    content={current_post.content}
                  />
                  {user?.name === current_post.author.name && (
                    <>
                      <button
                        name={`delete-${current_post.id}`}
                        onClick={() => del_note(position)}
                      >
                        Delete
                      </button>
                      <button
                        name={`edit-${current_post.id}`}
                        onClick={() => sta_edit(position, current_post.content)}
                      >
                        Edit
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-center">
        <button
          name="previous"
          onClick={() => handlePageClick(activePage === 1 ? 1 : activePage - 1)}
        >
          Prev
        </button>
        <button name="first" onClick={() => handlePageClick(1)}>
          First
        </button>
        {handlePagesButtons().map((page) => (
          <button
            name={`page-${page}`}
            key={`${page}`}
            onClick={() => handlePageClick(page)}
            style={{ fontWeight: page === activePage ? "bolder" : "normal" }}
          >
            {page}
          </button>
        ))}
        <button
          name="next"
          onClick={() =>
            handlePageClick(
              activePage === total_num_of_pages
                ? total_num_of_pages
                : activePage + 1
            )
          }
        >
          Next
        </button>
        <button name="last" onClick={() => handlePageClick(total_num_of_pages)}>
          Last
        </button>
      </div>
    </div>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  try {
    const notesResponse = await axios.get(NOTES_URL, {
      params: {
        _page: 1,
        _per_page: POSTS_PER_PAGE,
      },
    });

    const totalResponse = await axios.get(`${NOTES_URL}/total`);

    return {
      props: {
        initialNotes: notesResponse.data,
        initialTotalPages: Math.ceil(totalResponse.data.total / POSTS_PER_PAGE),
        initialTotalPosts: totalResponse.data.total,
      },
    };
  } catch (error) {
    console.error("Error fetching notes:", error);
    return {
      props: {
        initialNotes: [],
        initialTotalPages: 0,
        initialTotalPosts: 0,
      },
    };
  }
};
