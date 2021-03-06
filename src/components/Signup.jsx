import React, { Component } from 'react';
import FormLine from './FormLine';
import Button from './Button';
import Login from './Login';
import axios from 'axios';


//This component allows a new user to sign up and takes him directly to the
//Login Page, where they confirm their login works, and move onto the Main Hub

class Signup extends Component {
  constructor(props) {
    super(props);
    this.state = {
      firstName: "",
      lastName: "",
      email: "",
      pword: "",
      confirmPword: "",
      msg:''
    }
  }

  Submit() {
    if (this.state.firstName &&
        this.state.lastName &&
        this.state.email &&
        this.state.pword &&
        this.state.confirmPword) {
      if (this.state.pword === this.state.confirmPword) {
        axios.post('http://localhost:1337/register', {
          firstName: this.state.firstName,
          lastName: this.state.lastName,
          email: this.state.email,
          password: this.state.pword,
        })
        .then((resp) => {
          if (resp.data.status === 200) {
            // redirect to login
            this.props.toggleReg();
          } else {
            console.log('error!,', resp);
          }
        })
        .catch((err) => {
          console.log('Error: ', err);
        });
      } else {
        this.setState({
          msg: 'passwords must match'
        })
      }
    } else {
      this.setState({
        msg: 'fill in everything'
      })
    }
  }


  render() {
    return (
      <div>
      <center>
        <form style={{marginTop: '15vh'}} className="well">
        <h3 className="title"> Sign up </h3>
        <h2>{this.state.msg}</h2>
        <FormLine name = "FirstName" type = "text" value = {this.state.firstName} onChange={(e)=> this.setState({
          firstName: e.target.value
        })}/>
        <FormLine name = "LastName" type = "text" value = {this.state.lastName} onChange={(e)=> this.setState({
          lastName: e.target.value
        })}/>
        <FormLine name = "Email" type = "text" value = {this.state.email} onChange={(e)=> this.setState({
          email: e.target.value
        })} />
        <FormLine name = "Password" type = "password" value = {this.state.pword} onChange={(e)=> this.setState({
            pword: e.target.value
        })} />
        <FormLine name = "ConfirmPassword" type = "password" value = {this.state.confirmPword} onChange={(e)=> this.setState({
          confirmPword: e.target.value
        })}/>
        <Button type = "Submit" onClick={()=>this.Submit()}/>
      </form>
      <div style={{paddingTop: '3vh'}}><button style={{ color: 'grey' }} type="button" className="btn btn-link btn-sm" onClick={()=>this.props.toggleReg()}>Already a fan of MeerDocs? Click here to login.</button></div>
      <div style={{color: 'grey', paddingTop: '15vh'}} className="textMuted">
          We hope you enjoy MeerDocs as much as we do, please create an account so you can begin using our product
      </div>
      <div><img style={{marginTop: '2vh'}} className = 'navLogo' src={'https://i.imgur.com/EeRNcBe.png'} alt={'cant get image'} width='70'/></div>
    </center>
    </div>
    );
  }
}

export default Signup;
