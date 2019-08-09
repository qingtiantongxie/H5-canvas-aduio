// 播放列表
let lists=$("#lists")[0],
	lis=$("#lists li");

// 可视化区域
let boxCan=$("#box-can")[0],
	width,height;

// 进度条
let progress=$("#progress")[0],
	loadTip=$("#progress_bar_tip")[0],
	progress_bar=$("#progress_bar")[0];

let ball=$("#ball")[0],
	maxWidth;


// 控制区域
let totalTime=$(".totalTime")[0],
	currentTime=$(".currentTime")[0];
let volumn=$("#volumn")[0];
let muti=$(".muti")[0],
	localFile=$(".localFile")[0],
	loop=$(".loop")[0],
	upLoadFile=$(".music-file")[0],
	download=$(".download a")[0],
	playBtn = $(".play")[0],
	pauseBtn = $('.pause')[0];


let canvas=document.createElement("canvas"),ctx;
	canvas.setAttribute("id","canvas");
// 虚拟滑步检测
	if(!(canvas.getContext&&canvas.getContext("2d"))){
		alert("您的浏览器不支持canvas元素")
	}else{
		boxCan.appendChild(canvas);
		ctx=canvas.getContext("2d");
		ctx.rotate(Math.PI/2);	
	}

let xhr;
	try{
		xhr=new XMLHttpRequest();
	}catch(e){
		xhr=new ActiveXObject("Microsoft.XMLHTTP");
	}

// 动画声明，用来吊起 canvas 动画
let RAF = (function() {
    return window.requestAnimationFrame || 
    	   window.webkitRequestAnimationFrame || 
    	   window.mozRequestAnimationFrame || 
    	   window.oRequestAnimationFrame || 
    	   window.msRequestAnimationFrame || 
    	   function(callback) {
              window.setTimeout(callback, 1000 / 60);
           };
	})();

let size=64;
let AC;

let gainNode;
	
let analyserNode;
let bufferSource;
let rt_array=[];//用来存储音频条

function $(el){
	return document.querySelectorAll(el);
}
// 美化时间 222s=>03:42
function timeFormate(time){
	let m=Math.floor(time/60),
		s=parseInt(time%60);

	m=m<10?"0"+m:m;
	s=s<10?"0"+s:s;

	return `${m}:${s}`;
}

function resize(){
	maxWidth=progress.clientWidth-ball.clientWidth;
	width=boxCan.clientWidth,
	height=boxCan.clientHeight;
	canvas.width=width;
	canvas.height=height;
}
resize();

window.onresize=resize;

function initAnimate(){
	var arr=new Uint8Array(analyserNode.frequencyBinCount);
	let w=width/size; //音频条宽度
	for(let i=0;i<size;i++){
		rt_array.push(new Retangle(i*w,height,w*0.8,4));
	}
	function animate(){
		analyserNode.getByteFrequencyData(arr);
		ctx.clearRect(0,0,width,height);
		for(let i=0;i<size;i++){
			let n=arr[i];
			rt_array[i].update(n/256*(height-4));
		}
		RAF(animate);
	}
	animate();
}

// 单个音谱条对象
function Retangle(x,y,w,h){
	this.w=w;//width
	this.h=h;//height
	this.x=x;//position x
	this.y=y;//position y
	this.power=0;//音频条高度
	this.num=0;//音频条中方块数量
	this.dy=y;//小红块位置
	this.line=ctx.createLinearGradient(0,0,0,height);
	this.line.addColorStop(0,"red");
	this.line.addColorStop(0.5,"yellow");
	this.line.addColorStop(1,"#00E800");
}

let RP=Retangle.prototype;

RP.update=function(power){
	this.power=power;
	// this.num=power/(this.h+2);
	this.num= ~~(this.power / this.h + 0.5);
	// 更新小红块的位置
	let nh=this.dy;
	if(nh>this.y-this.h){
		this.dy=this.y-this.h;
	}else if(nh>this.y-this.power){
		this.dy=this.y-this.power-this.h-(power==0?0:1);
	}else{
		this.dy+=1
	}
	this.draw();
};

RP.draw=function(){
	ctx.fillStyle=this.line;
	ctx.fillRect(this.x,this.y-this.power,this.w,this.power);
	for(let j=0;j<this.num;j++){
		var y = this.y - j * (this.h + 2);//从下到上清除
		ctx.clearRect(this.x,y,this.w,2);
	}
	ctx.fillStyle="red";
	ctx.fillRect(this.x,this.dy,this.w,this.h);
}

// 用来控制整个项目的运行
let app={
	bufferSource:null,
	arr:[],
	hasClass:0,
	value:60,
	loop:0,
	nowIndex:0,
	timer:null,
	init(){
		this.generateAudioContext()
		this.bind();
	},
	generateAudioContext(){
		// audioContext 实例，音频处理的环境和上下文，一般一个demo只保持一个
		AC=new (window.AudioContext||window.webkitAudioContext)();

		// 音量控制器，一般取值0-1
		gainNode=AC[AC.createGain?"createGain":"createGainNode"]();
		gainNode.gain.value= this.value
		// 音频节点分析器，用来实时分析音频的节点和频率
		analyserNode=AC.createAnalyser();

		// FFT是离散傅里叶变换的快速算法，用于将一个信号变换到频域，得到的值是32-2048之间的2的整数次倍，默认是2048。
		// 实时得到的音频频域的数据个数为fftSize的一半，默认是1024，我们这里取32
		analyserNode.fftSize=size*2;
				// 创建一个播放控制对象
		bufferSource=AC.createBufferSource();

		bufferSource.connect(analyserNode);
		analyserNode.connect(gainNode);
		gainNode.connect(AC.destination);// AC.destination：音频输出聚集地，类似于音频的播放硬件

		bufferSource.onended=()=>{
			if(totalTime.innerHTML>currentTime.innerHTML) return;
			clearInterval(this.timer);
			switch(this.loop){
				case 1:
					this.changeSource(this.nowIndex)
					break;
				case 2:
					let n=Math.floor(Math.random()*lis.length)
					this.changeSource(n);
					break;
				case 0:
					this.changeSource(Number(this.nowIndex)+1);
					break;
			}
		}
		bufferSource[bufferSource.start?"start":"noteOn"](0,AC.currentTime);
	},
	bind(){
		let that=this;
		// 播放按钮的点击事件
		playBtn.onclick=function(){
			if(AC.currentTime > 0){
				console.log('播放一段停止')
				that.play()
			}else{
				that.changeSource(that.nowIndex)
			}

			
		}
		// 暂停按钮的点击事件
		pauseBtn.onclick=function(){
			that.stop()
		}
		// 音乐列表的点击事件
		lists.onclick=function(e){
			const el = e.target
			if(el==this) return;
			if(el.className.indexOf('selected')>=0) return
			const index=parseInt(el.getAttribute("data-index"));
			that.changeSource(index)
		}

		// 音量控制事件
		volumn.oninput=function(value){
			if(typeof value==="number"){
				this.value=value;
			}
			this.style.background= `linear-gradient(to right, red, white ${this.value}%, blue)`;
			
			gainNode.gain.value= that.value = this.value/this.max;
		}
		volumn.oninput();
		// 静音按钮事件
		let ismuti=false,volumn_value;
		muti.onclick=function(){
			if(!ismuti)  volumn_value=parseInt(volumn.value);
			ismuti=!ismuti;
			if(ismuti){
				this.className=this.className+" muti_true";
				volumn.oninput(0);
			}else{
				this.className=this.className.replace(/\smuti_true/,"")
				volumn.oninput(volumn_value);
			}
		}
		
		// 本地文件相关事件
		localFile.onclick=function(){
			upLoadFile.click();
		}
		upLoadFile.onchange=function(){
			if(!this.files.length) return;
			let html=[];
			[].slice.call(this.files).forEach((item,index)=>{
				let fr=new FileReader(),
					fileName=item.name.substring(0,item.name.lastIndexOf(".")),
					i=lis.length+index;

				fr.readAsArrayBuffer(item);

				html.push(`<li title="fileName" data-index=${i}>加载中...</li>`);
				
				fr.onload=function(e){
					that.stop()
					that.generateAudioContext()
					that.decode(e.target.result,i,fileName);
				}
			})
			lists.innerHTML=lists.innerHTML+html.join(" ");
			lis=$("#lists li");
		}
		// this.loop{
		// 	0: 列表循环
		// 	1: 单曲循环
		// 	2: 随机播放
		// }
		loop.onclick=function(){
			that.loop++;
			if(that.loop>=3){
				that.loop=0;
			}
			switch(that.loop){
				case 1:
					this.innerText="单曲循环"
					break;
				case 2:
					this.innerText="随机播放"
					break;
				case 0:
					this.innerText="列表循环"
					break;
			}
		}
	},
	load(url,i){//加载音乐
		let that=this;
		loadTip.style.width = 0
		xhr.abort();
		xhr.responseType="arraybuffer";//返回一段二进制数据
		xhr.onprogress=function(e){//加载进度条
			loadTip.style.width=`${e.loaded/e.total*100}%`;
		}
		xhr.onload=function(){//类似onreadystatechange
			that.decode(this.response,i);
		}
		xhr.open("get",url);
		xhr.send();
	},
	decode(source,i,name){// 对二进制数据进行解码
		let that=this;
		AC.decodeAudioData(source,(buffer)=>{
			that.arr[i]=buffer;//对音乐进行缓存
			if(name)
				lis[lis.length-1].innerText=name;
			that.trigger(i);
		},(err)=>{
			console.log(`errMessage:${err}`);
		});
	},
	trigger(i){
		i=i>lis.length-1?0:i;
		
		this.nowIndex=i;//当前正在播放的音乐的索引
		this.changeClass(i);

		if(this.arr[i]){//如果音乐已经缓存，直接播放
			this.play(this.arr[i]);
		}else{//如果没有缓存，就从服务器获取数据
			this.load("media/"+lis[i].title,i);
		}
		download.href="media/"+lis[i].title;//设置下载
		download.setAttribute("download",lis[i].title);
	},
	changeClass(i){
		lis[this.hasClass].className="";
		lis[i].className="selected";
		this.hasClass=i;
	},
	play(buffer){
		if(buffer)
			bufferSource.buffer=buffer;
		AC.resume()
		this.loadBarAni(bufferSource.buffer);//播放的进度条
		playBtn.className = playBtn.className.replace('show','hide')
		pauseBtn.className = pauseBtn.className.replace('hide','show')
	},
	stop(){
		AC.suspend() 
		clearInterval(this.timer);
		pauseBtn.className = pauseBtn.className.replace('show','hide')
		playBtn.className = pauseBtn.className.replace('hide','show')
	},
	changeSource(i){
		this.stop()
		this.generateAudioContext()
		this.trigger(i)
	},
	loadBarAni(buffer){//播放进度条动画及播放时间切换
		let that=this;
		totalTime.innerText=timeFormate(buffer.duration);
		clearInterval(this.timer);
		this.timer=setInterval(()=>{
			precent=AC.currentTime/buffer.duration;
			ball.style.transform=`translate(${precent*maxWidth}px,-7px)`;
			progress_bar.style.width=precent*maxWidth+"px";
			currentTime.innerHTML=timeFormate(AC.currentTime);
		},20)
	}
}

window.onload=function(){
	app.init();
	initAnimate();
}

