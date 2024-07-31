import React from 'react';
import { useNavigate } from 'react-router-dom';

interface NavbarProps {
  isLoggedIn: boolean;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ isLoggedIn, onLogout }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/'); 
  };

  return (
    <div className="navbar">
      <h1>Puck</h1>
      <div className="line"></div>
      {isLoggedIn && (
        <button onClick={handleLogout} className="logout-button">Logout</button>
      )}
    </div>
  );
};

export default Navbar;
