export const UserPost: React.FC<Post> = ({ id, title, author, content }) => {
  return (
    <div key={id} id={`${id}`} className="note">
      <h1>{title}</h1>
      <small>
        By: {author.name} ({author.email})
      </small>
      <p>{content}</p>
    </div>
  );
};

export interface Post {
  id: number;
  title: string;
  author: {
    name: string;
    email: string;
  };
  content: string;
}
