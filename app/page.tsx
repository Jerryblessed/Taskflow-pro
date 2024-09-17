"use client";
import React, { useState, useEffect, useRef } from "react";
import { useConvexAuth } from "convex/react";
import { SignInButton, UserButton } from "@clerk/clerk-react";
import useStoreUserEffect from "@/hooks/useStoreUser";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Chart, ChartConfiguration } from "chart.js/auto";
import Confetti from "react-confetti";

type TodosMemory = {
  [key: string]: boolean; // Mapping todo._id to boolean for checked status
};

export default function Home() {
  const { isAuthenticated } = useConvexAuth();
  const userId = useStoreUserEffect();
  const [text, setText] = useState("");
  const [category, setCategory] = useState("Business");
  const [todosMemory, setTodosMemory] = useState<TodosMemory>({});
  const [teamMode, setTeamMode] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [createTeamName, setCreateTeamName] = useState("");
  const [findTeamName, setFindTeamName] = useState("");
  const [chartData, setChartData] = useState({ labels: [], achieved: [], total: [] });
  const chartInstanceRef = useRef<Chart | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showChat, setShowChat] = useState(false); // Gemini chat window state

  const createTodo = useMutation(api.todos.createTodo);
  const todos = useQuery(api.todos.getTodos);
  const categories = ["Business", "Education", "Finance", "Health", "Career"];

  useEffect(() => {
    const storedTodos = JSON.parse(localStorage.getItem("todosMemory") || "{}");
    setTodosMemory(storedTodos);
  }, []);

  useEffect(() => {
    localStorage.setItem("todosMemory", JSON.stringify(todosMemory));
  }, [todosMemory]);

  useEffect(() => {
    if (todos) {
      const totalTodos = categories.map((cat) =>
        todos.filter((todo) => todo.text.includes(cat)).length
      );
      const achievedTodos = categories.map((cat) =>
        todos.filter(
          (todo) => todo.text.includes(cat) && todosMemory[todo._id.toString()]
        ).length
      );
      setChartData({
        labels: categories,
        achieved: achievedTodos,
        total: totalTodos,
      });
    }
  }, [todos, todosMemory]);

  // Handle chart rendering
  useEffect(() => {
    const ctx = document.getElementById("todosChart") as HTMLCanvasElement;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const config: ChartConfiguration = {
      type: "bar",
      data: {
        labels: chartData.labels,
        datasets: [
          {
            label: "Achieved Todos",
            data: chartData.achieved,
            backgroundColor: "rgba(54, 162, 235, 0.2)",
            borderColor: "rgba(54, 162, 235, 1)",
            borderWidth: 1,
            onClick: () => handleAchievedClick(),
          },
          {
            label: "Total Todos",
            data: chartData.total,
            backgroundColor: "rgba(255, 99, 132, 0.2)",
            borderColor: "rgba(255, 99, 132, 1)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
          },
        },
        onClick: (event, elements) => {
          if (elements.length > 0 && elements[0].datasetIndex === 0) {
            handleAchievedClick();
          }
        },
      },
    };

    chartInstanceRef.current = new Chart(ctx, config);

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [chartData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim() === "") return;

    const fullText = `${userId} + ${category} + ${teamName ? `${teamName} + ` : ""}${text}`;
    createTodo({
      text: fullText,
    }).then(() => {
      setText("");
    });
  };

  const handleCreateTeam = () => {
    if (createTeamName.trim() === "") return;
    setTeamName(createTeamName);
    setCreateTeamName("");
  };

  const handleFindTeam = () => {
    if (findTeamName.trim() === "") return;
    setTeamName(findTeamName);
    setFindTeamName("");
  };

  const filteredTodos = todos
    ?.filter((todo) => todo.text.includes(`${userId} +`))
    ?.filter((todo) => todo.text.includes(teamName))
    ?.map((todo) => ({
      ...todo,
      text: todo.text
        .replace(`${userId} + `, "")
        .replace(`${teamName} + `, ""),
    }));

  const handleAchievedClick = () => {
    // Show confetti and success emojis
    setShowConfetti(true);
    setTimeout(() => {
      setShowConfetti(false);
    }, 5000);
  };

  return (
    <main className="main-container">
      <div className="auth-section">
        <h1 className="app-title">TaskFlow</h1>
        {isAuthenticated ? (
          <>
            <p>Welcome, User ID: {userId}</p>
            {teamName && <div className="team-name">Current Team: {teamName}</div>}
            <UserButton afterSignOutUrl="/" />

            <div className="team-section">
              <label>
                <input
                  type="checkbox"
                  checked={teamMode}
                  onChange={() => setTeamMode(!teamMode)}
                />{" "}
                Enable Team Collaboration
              </label>

              {teamMode && (
                <>
                  <div>
                    <input
                      placeholder="Create Team"
                      value={createTeamName}
                      onChange={(e) => setCreateTeamName(e.target.value)}
                    />
                    <button className="team-button" onClick={handleCreateTeam}>
                      Create Team
                    </button>
                  </div>

                  <div>
                    <input
                      placeholder="Find Team"
                      value={findTeamName}
                      onChange={(e) => setFindTeamName(e.target.value)}
                    />
                    <button className="team-button" onClick={handleFindTeam}>
                      Find Team
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="task-section">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`category-button ${category === cat ? "selected" : ""}`}
                >
                  {cat}
                </button>
              ))}

              {filteredTodos?.map((todo) => (
                <div key={todo._id} className="todo-item">
                  <p>{todo.text}</p>
                  <input
                    type="checkbox"
                    checked={!!todosMemory[todo._id.toString()]}
                    onChange={() =>
                      setTodosMemory((prev) => ({
                        ...prev,
                        [todo._id.toString()]: !prev[todo._id.toString()],
                      }))
                    }
                  />
                </div>
              ))}

              <form onSubmit={handleSubmit} className="task-form">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Add a new task"
                  className="task-input"
                />
                <button type="submit" className="task-button">
                  Add Todo
                </button>
              </form>
            </div>

            {/* Chart Integration */}
            <div className="chart-section">
              <canvas id="todosChart"></canvas>
            </div>

            {/* Show confetti on achieving todos */}
            {showConfetti && (
              <Confetti
                width={window.innerWidth}
                height={window.innerHeight}
                recycle={false}
                numberOfPieces={500}
              />
            )}

            {/* Success message */}
            {showConfetti && (
              <div className="success-message">
                🎉🎈 Great job! Keep up the awesome work! 🎈🎉
              </div>
            )}

            {/* Gemini 1.0 Chat Integration */}
            <div className="chat-section">
              <button onClick={() => setShowChat(!showChat)} className="chat-icon">
                💬 Open Gemini Chat
              </button>

              {showChat && (
                <iframe
                  src="https://gemini-chat-eight-bice.vercel.app/"
                  className="chat-iframe"
                  title="Gemini Chat"
                ></iframe>
              )}
            </div>
          </>
        ) : (
          <SignInButton />
        )}
      </div>



      <style jsx>{`
.main-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: #f9fafb;
}

.auth-section {
  text-align: center;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
}

.app-title {
  font-size: 2.5rem;
  font-weight: bold;
  color: #333;
  margin-bottom: 20px;
}

.team-section, .task-section, .chart-section {
  margin-top: 20px;
  width: 100%;
}

.team-name {
  font-size: 1.2rem;
  color: #4f46e5;
  font-weight: bold;
  margin-bottom: 10px;
}

.team-button {
  background-color: #4f46e5;
  color: white;
  border: none;
  padding: 8px 16px;
  cursor: pointer;
  margin-top: 10px;
  border-radius: 4px;
}

.category-button {
  background-color: #f3f4f6;
  border: 2px solid #ddd;
  padding: 8px 12px;
  margin-right: 8px;
  border-radius: 4px;
  cursor: pointer;
}

.category-button.selected {
  background-color: #6366f1;
  color: white;
}

.todo-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #f9fafb;
  border: 1px solid #ddd;
  padding: 10px;
  margin-bottom: 10px;
  border-radius: 4px;
}

.task-form {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
}

.task-input {
  padding: 10px;
  width: 70%;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-right: 10px;
}

.task-button {
  background-color: #4f46e5;
  color: white;
  border: none;
  padding: 10px 16px;
  cursor: pointer;
  border-radius: 4px;
}

.chart-section {
  margin-top: 40px;
  width: 100%;
  max-width: 600px;
}

.success-message {
  font-size: 1.5rem;
  font-weight: bold;
  color: #4caf50;
  margin-top: 20px;
}

.chat-section {
  position: fixed;
  bottom: 20px;
  left: 20px;
}

.chat-icon {
  background-color: #4f46e5;
  color: white;
  border: none;
  padding: 10px 16px;
  cursor: pointer;
  border-radius: 50%;
}

.chat-iframe {
  width: 350px;
  height: 400px;
  border: none;
  position: fixed;
  bottom: 80px;
  left: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

@media (max-width: 600px) {
  .task-input {
    width: 100%;
  }

  .chart-section {
    width: 100%;
    margin: 20px auto;
  }
}
        }
      `}</style>
    </main>
  );
}
