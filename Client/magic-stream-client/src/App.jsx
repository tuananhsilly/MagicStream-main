import { useState, useEffect } from 'react'
import './App.css'
import Home from './components/home/Home';
import Review from './components/review/Review';
import Header from './components/header/Header';
import Register from './components/register/Register';
import Login from './components/login/Login';
import Layout from './components/Layout';
import RequiredAuth from './components/RequiredAuth';
import AdminRoute from './components/admin/AdminRoute';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminMovies from './components/admin/AdminMovies';
import AdminMovieEdit from './components/admin/AdminMovieEdit';
import AdminUsers from './components/admin/AdminUsers';
import AdminUserDetail from './components/admin/AdminUserDetail';
import AdminSubscriptions from './components/admin/AdminSubscriptions';
import Account from './components/account/Account';
import SubscriptionPage from './components/subscription/SubscriptionPage';
import axiosClient from './api/axiosConfig';
import useAuth from './hooks/useAuth';
import StreamMovie from './components/stream/StreamMovie';
import MyList from './components/myList/MyList';
import Recommended from './components/recommended/Recommended';

import {Navigate, Route, Routes, useNavigate} from 'react-router-dom'

function App() {

  const navigate = useNavigate();
  const { auth, setAuth } = useAuth();

  
  const updateMovieReview = (imdb_id) => {
      navigate(`/review/${imdb_id}`);
  };
   
  const handleLogout = async () => {

        try {
            const response = await axiosClient.post("/logout",{user_id: auth.user_id});
            console.log(response.data);
            setAuth(null);
           // localStorage.removeItem('user');
            console.log('User logged out');

        } catch (error) {
            console.error('Error logging out:', error);
        } 

    };

  return (
    <>
      <Header handleLogout = {handleLogout}/>
      <Routes path="/" element = {<Layout/>}>
        <Route path="/" element={<Home updateMovieReview={updateMovieReview}/>}></Route>
        <Route path="/register" element={<Register/>}></Route>
        <Route path="/login" element={<Login/>}></Route>

        <Route element = {<RequiredAuth/>}>
            <Route path="/account" element={<Account/>}></Route>
            <Route path="/subscribe" element={<SubscriptionPage/>}></Route>
            <Route path="/review/:imdb_id" element={<Review/>}></Route>
            <Route path="/stream/:yt_id" element={<StreamMovie/>}></Route>
            <Route path="/mylist" element={<MyList/>}></Route>
            <Route path="/recommended" element={<Recommended/>}></Route>
        </Route>
        
        {/* Admin routes */}
        <Route element={<AdminRoute/>}>
            <Route path="/admin" element={<AdminDashboard/>}></Route>
            <Route path="/admin/users" element={<AdminUsers/>}></Route>
            <Route path="/admin/users/:user_id" element={<AdminUserDetail/>}></Route>
            <Route path="/admin/subscriptions" element={<AdminSubscriptions/>}></Route>
            <Route path="/admin/movies" element={<AdminMovies/>}></Route>
            <Route path="/admin/movies/:imdb_id" element={<AdminMovieEdit/>}></Route>
        </Route>
      </Routes>

    </>
  )
}

export default App
