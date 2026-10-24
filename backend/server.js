import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();
const app=express();
const ROOT=path.dirname(fileURLToPath(import.meta.url));
const FILE=path.join(ROOT,'data.json');
const secret=process.env.JWT_SECRET;
if(!secret || secret.length<24){console.error('Set JWT_SECRET (24+ chars) in backend/.env');process.exit(1)}
app.use(helmet());app.use(cors({origin:process.env.CLIENT_ORIGIN||'http://localhost:5173'}));app.use(express.json({limit:'100kb'}));
app.use('/api/login',rateLimit({windowMs:15*60*1000,limit:30,standardHeaders:'draft-7',legacyHeaders:false}));
const seed=()=>({users:[
 {id:1,name:'Campus Admin',email:'admin@campus.test',role:'admin',password:bcrypt.hashSync('Admin123!',10)},
 {id:2,name:'Dr. Maya Thomas',email:'faculty@campus.test',role:'faculty',password:bcrypt.hashSync('Faculty123!',10)},
 {id:3,name:'Aarav Nair',email:'student@campus.test',role:'student',password:bcrypt.hashSync('Student123!',10)}],
 courses:[{id:1,code:'CS101',title:'Web Development',facultyId:2},{id:2,code:'CS202',title:'Database Systems',facultyId:2},{id:3,code:'CS303',title:'Software Engineering',facultyId:2}],
 enrollments:[{studentId:3,courseId:1},{studentId:3,courseId:2}],
 attendance:[{id:1,studentId:3,courseId:1,date:'2026-10-01',status:'present'}],
 assignments:[{id:1,courseId:1,title:'Build a React Component',due:'2026-11-15'}],submissions:[],
 announcements:[{id:1,title:'Welcome to Smart Campus',body:'Your academic dashboard is ready.',createdAt:new Date().toISOString()}]});
if(!fs.existsSync(FILE))fs.writeFileSync(FILE,JSON.stringify(seed(),null,2));
const load=()=>JSON.parse(fs.readFileSync(FILE,'utf8'));
const save=db=>fs.writeFileSync(FILE,JSON.stringify(db,null,2));
const safeUser=({password,...u})=>u;
const auth=(req,res,next)=>{try{const token=(req.headers.authorization||'').replace(/^Bearer /,'');req.user=jwt.verify(token,secret);next()}catch{return res.status(401).json({error:'Please log in'})}};
const roles=(...allowed)=>(req,res,next)=>allowed.includes(req.user.role)?next():res.status(403).json({error:'Access denied'});
const nextId=items=>Math.max(0,...items.map(x=>x.id))+1;
app.get('/api/health',(_,res)=>res.json({ok:true}));
app.post('/api/login',(req,res)=>{const {email,password}=req.body||{};const u=load().users.find(x=>x.email===String(email||'').toLowerCase());if(!u||!bcrypt.compareSync(String(password||''),u.password))return res.status(401).json({error:'Invalid credentials'});res.json({token:jwt.sign({id:u.id,role:u.role,name:u.name},secret,{expiresIn:'8h'}),user:safeUser(u)})});
app.get('/api/me',auth,(req,res)=>{const u=load().users.find(x=>x.id===req.user.id);return u?res.json(safeUser(u)):res.sendStatus(404)});
app.get('/api/dashboard',auth,(req,res)=>{const d=load();const a=d.attendance.filter(x=>req.user.role!=='student'||x.studentId===req.user.id);res.json({students:d.users.filter(x=>x.role==='student').length,faculty:d.users.filter(x=>x.role==='faculty').length,courses:d.courses.length,attendanceRate:a.length?Math.round(a.filter(x=>x.status==='present').length/a.length*100):0})});
app.get('/api/students',auth,roles('admin','faculty'),(_,res)=>res.json(load().users.filter(x=>x.role==='student').map(safeUser)));
app.post('/api/students',auth,roles('admin'),(req,res)=>{const {name,email,password}=req.body||{};if(!name||!/^\S+@\S+\.\S+$/.test(email||'')||String(password||'').length<8)return res.status(400).json({error:'Name, valid email and password (8+ characters) required'});const d=load();if(d.users.some(u=>u.email===email.toLowerCase()))return res.status(409).json({error:'Email already exists'});const u={id:nextId(d.users),name,email:email.toLowerCase(),role:'student',password:bcrypt.hashSync(password,10)};d.users.push(u);save(d);res.status(201).json(safeUser(u))});
app.delete('/api/students/:id',auth,roles('admin'),(req,res)=>{const d=load(),id=Number(req.params.id);if(!d.users.some(x=>x.id===id&&x.role==='student'))return res.sendStatus(404);d.users=d.users.filter(x=>x.id!==id);d.enrollments=d.enrollments.filter(x=>x.studentId!==id);d.attendance=d.attendance.filter(x=>x.studentId!==id);d.submissions=d.submissions.filter(x=>x.studentId!==id);save(d);res.sendStatus(204)});
app.get('/api/courses',auth,(req,res)=>{const d=load();res.json(req.user.role==='student'?d.courses.filter(c=>d.enrollments.some(e=>e.courseId===c.id&&e.studentId===req.user.id)):req.user.role==='faculty'?d.courses.filter(c=>c.facultyId===req.user.id):d.courses)});
app.post('/api/courses',auth,roles('admin'),(req,res)=>{const {code,title,facultyId}=req.body||{};const d=load();if(!code||!title||!d.users.some(u=>u.id===Number(facultyId)&&u.role==='faculty'))return res.status(400).json({error:'Code, title and valid faculty required'});const c={id:nextId(d.courses),code,title,facultyId:Number(facultyId)};d.courses.push(c);save(d);res.status(201).json(c)});
app.get('/api/faculty',auth,(_,res)=>res.json(load().users.filter(x=>x.role==='faculty').map(safeUser)));
app.get('/api/announcements',auth,(_,res)=>res.json(load().announcements));
app.post('/api/announcements',auth,roles('admin','faculty'),(req,res)=>{const {title,body}=req.body||{};if(!title||!body)return res.status(400).json({error:'Title and message required'});const d=load(),a={id:nextId(d.announcements),title,body,createdAt:new Date().toISOString()};d.announcements.unshift(a);save(d);res.status(201).json(a)});
app.get('/api/assignments',auth,(req,res)=>{const d=load(),allowed=d.courses.filter(c=>req.user.role==='admin'||(req.user.role==='faculty'&&c.facultyId===req.user.id)||(req.user.role==='student'&&d.enrollments.some(e=>e.studentId===req.user.id&&e.courseId===c.id))).map(c=>c.id);res.json(d.assignments.filter(a=>allowed.includes(a.courseId)))});
app.post('/api/assignments',auth,roles('faculty'),(req,res)=>{const {courseId,title,due}=req.body||{},d=load();if(!title||!due||!d.courses.some(c=>c.id===Number(courseId)&&c.facultyId===req.user.id))return res.status(400).json({error:'Invalid assignment or course'});const a={id:nextId(d.assignments),courseId:Number(courseId),title,due};d.assignments.push(a);save(d);res.status(201).json(a)});
app.get('/api/submissions',auth,(req,res)=>{const d=load();res.json(d.submissions.filter(s=>req.user.role==='admin'||(req.user.role==='student'&&s.studentId===req.user.id)||(req.user.role==='faculty'&&d.assignments.some(a=>a.id===s.assignmentId&&d.courses.some(c=>c.id===a.courseId&&c.facultyId===req.user.id)))))});
app.post('/api/submissions',auth,roles('student'),(req,res)=>{const {assignmentId,response}=req.body||{},d=load(),a=d.assignments.find(x=>x.id===Number(assignmentId));if(!a||!response||!d.enrollments.some(e=>e.studentId===req.user.id&&e.courseId===a.courseId))return res.status(400).json({error:'Invalid submission'});if(d.submissions.some(s=>s.assignmentId===a.id&&s.studentId===req.user.id))return res.status(409).json({error:'Already submitted'});const s={id:nextId(d.submissions),assignmentId:a.id,studentId:req.user.id,response,submittedAt:new Date().toISOString()};d.submissions.push(s);save(d);res.status(201).json(s)});
app.get('/api/attendance',auth,(req,res)=>{const d=load();res.json(d.attendance.filter(a=>req.user.role==='admin'||(req.user.role==='student'&&a.studentId===req.user.id)||(req.user.role==='faculty'&&d.courses.some(c=>c.id===a.courseId&&c.facultyId===req.user.id))))});
app.post('/api/attendance',auth,roles('faculty'),(req,res)=>{const {studentId,courseId,date,status}=req.body||{},d=load(),cid=Number(courseId),sid=Number(studentId);if(!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||!['present','absent'].includes(status)||!d.courses.some(c=>c.id===cid&&c.facultyId===req.user.id)||!d.enrollments.some(e=>e.courseId===cid&&e.studentId===sid))return res.status(400).json({error:'Invalid attendance data'});let a=d.attendance.find(x=>x.courseId===cid&&x.studentId===sid&&x.date===date);if(a)a.status=status;else{a={id:nextId(d.attendance),studentId:sid,courseId:cid,date,status};d.attendance.push(a)}save(d);res.json(a)});
app.get('/api/enrollments',auth,(req,res)=>{const d=load();res.json(d.enrollments.filter(e=>req.user.role==='admin'||(req.user.role==='student'&&e.studentId===req.user.id)||(req.user.role==='faculty'&&d.courses.some(c=>c.id===e.courseId&&c.facultyId===req.user.id))))});
app.post('/api/enrollments',auth,roles('admin'),(req,res)=>{const d=load(),studentId=Number(req.body?.studentId),courseId=Number(req.body?.courseId);if(!d.users.some(u=>u.id===studentId&&u.role==='student')||!d.courses.some(c=>c.id===courseId))return res.status(400).json({error:'Invalid student or course'});if(d.enrollments.some(e=>e.studentId===studentId&&e.courseId===courseId))return res.status(409).json({error:'Already enrolled'});d.enrollments.push({studentId,courseId});save(d);res.status(201).json({studentId,courseId})});
app.use((err,req,res,next)=>{console.error(err);res.status(500).json({error:'Server error'})});
app.listen(process.env.PORT||4000,()=>console.log(`Smart Campus API: http://localhost:${process.env.PORT||4000}`));
