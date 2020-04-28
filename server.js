const http = require('http');
const url = require('url');
const fs = require('fs');
const util = require('util');
const zlib = require('zlib');

const Koa = require('koa');
const app = new Koa();

var webpack = require('webpack');
var webpackMiddleware = require("koa-webpack-dev-middleware");
var webpackConfig = require('./webpack.config.js');
var request = require('request-promise')

const contentType = require('content-type');
const iconv = require('iconv-lite');

const promisify = util.promisify;
// node 11.7版本以上才支持此方法
const brotliDecompress = zlib.brotliDecompress && promisify(zlib.brotliDecompress);

const gunzip = promisify(zlib.gunzip);
const inflate = promisify(zlib.inflate);

const querystring = require('querystring');

async function transformEncode(buffer, encode) {
    let resultBuf = null;
    debugger;
    switch (encode) {
        case 'br':
            if (!brotliDecompress) {
                throw new Error('Node版本过低！ 11.6版本以上才支持brotliDecompress方法')
            }
            resultBuf = await brotliDecompress(buffer);
            break;
        case 'gzip':
            resultBuf = await gunzip(buffer);
            break;
        case 'deflate':
            resultBuf = await inflate(buffer);
            break;
        default:
            resultBuf = buffer;
            console.log(encode)
            break;
    }
    return resultBuf;
}

function transformCharset(buffer, charset) {
    charset = charset || 'UTF-8';
    // iconv将Buffer转化为对应charset编码的String
    const result = iconv.decode(buffer, charset);
    return result;
}

function formatData(str, contentType) {
    let result = '';
    switch (contentType) {
        case 'text/plain':
            result = str;
            break;
        case 'application/json':
            result = JSON.parse(str);
            break;
        case 'application/x-www-form-urlencoded':
            // 是否转码
            // querytring.unescape()
            result = querystring.parse(str);
            break;
        default:
            break;
    }
    return result;
}

function getRequestBody(req, res) {
    return new Promise(async (resolve, reject) => {
        const chunks = [];
        req.on('data', buf => {
            chunks.push(buf);
        })
        req.on('end', async () => {
            let buffer = Buffer.concat(chunks);
            // 获取content-encoding
            const encode = req.headers['content-encoding'];
            // 获取content-type
            //const { type, parameters } = contentType.parse(req) || {};
            //console.log(type);
	    //console.log(parameters);
	    // 获取charset
            const type = 'application/json'
	    const charset = 'UTF-8' 
	    //const charset = parameters.charset;
            console.log(charset);
	    // 解压缩
            buffer = await transformEncode(buffer, encode);
            // 转换字符编码
            const str = transformCharset(buffer, charset);
            // 根据类型输出不同格式的数据，如字符串或JSON对象
            const result = formatData(str, type);
            resolve(result);
        })
    }).catch(err => { throw err; })
}

async function fence_push(fenceinfo) {
   
    
    
    
    var options = { method: 'POST',
    url: 'http://47.92.24.232:1201/op/fenceinfo',
    headers: 
     { 'cache-control': 'no-cache',
    //   Connection: 'keep-alive',
    //   'Content-Length': '868',
       'Accept-Encoding': 'gzip, deflate',
    //   Host: '47.92.24.232:1209',
    //   'Postman-Token': 'ffa07874-df13-4c4f-b744-e15d106de93f,a5ce0f54-b611-4bfc-ab23-fe4b3afb036d',
    //   'Cache-Control': 'no-cache',
    //   Accept: '*/*',
    //   'User-Agent': 'PostmanRuntime/7.20.1',
       'Content-Type': 'application/json',
    //   SignId: 'baidu_yingyan' 
    },
    body: fenceinfo ,
    json: true };

    try {
  //     console.log('before')
        let parsedBody = await request(options)
  //     console.log(parsedBody)
  //     console.log('after')
        console.log(JSON.stringify(parsedBody))
        // G.logger.debug(JSON.stringify(parsedBody))
       // let bd = JSON.parse(parsedBody)
       // return G.jsResponse(G.STCODES.SUCCESS, 'success.', {bdSt: bd.status, bdMessage: bd.message})
    } catch (err) {
       console.log(err.message)
        // G.logger.error(err.message)
      //  return G.jsResponse(G.STCODES.EXCEPTION, err.message)
    }
  
}


function parseFenceInfo(data){
  
 let fenceinfo = [] 
  for (i=0;i<data.content.length;i++){
    let fence_alert = new Object()
    fence_alert.fence_id = data.content[i].fence_id
    fence_alert.monitored_person = data.content[i].monitored_person
    fence_alert.fence_name = data.content[i].fence_name
    fence_alert.action = data.content[i].action
    fence_alert.alarm_point = data.content[i].alarm_point
    fence_alert.pre_point = data.content[i].pre_point
    fenceinfo.push(fence_alert)
  }
  
  return fenceinfo
}


app.use(webpackMiddleware(webpack(webpackConfig))),

    app.use(async (ctx) => {
        const req = ctx.req;
        const res = ctx.res;
        let pathname = url.parse(req.url).pathname;
        let data = null;
        let targetPath = null;
        if (pathname === '/post') {
            const body = await getRequestBody(req, res);
             console.log(body);
            //收到来自鹰眼推送的电子围栏告警信息，转发至主服务器
            let fenceinfo = parseFenceInfo(body)
            //console.log(body)
           // fence_push(body)
            //console.log(fenceinfo)
            fence_push(fenceinfo)
            
            res.statusCode = 200;
            
            ctx.set('SignId' , 'baidu_yingyan')
            return ctx.body = {status: '0', message: '成功'}
            res.end();
	}
        if (pathname === '/') {
            pathname = '/index.html'
        }
        targetPath = `.${pathname}`;
        if (fs.existsSync(targetPath)) {
            data = fs.readFileSync(targetPath);
            res.statusCode = 200;
            res.end(data);
        }
    });

app.listen(1209);
