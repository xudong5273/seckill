//存放主要交互逻辑 js代码
// javascript 模块化
// seckill.detail.init(params);
var seckill = {
    //封装秒杀相关ajax的url
    URL: {
        now: function () {
            return '/seckilldemo/time/now';
        },
        exposer:function (seckillId) {
            return '/seckilldemo/'+seckillId+'/exposer';
        },
        execution:function (seckillId, md5) {
            return '/seckilldemo/'+seckillId+"/"+md5+'/execution';
        }
    },
    //验证手机号
    validatePhone: function (phone) {
        if (phone && phone.length == 11 && !isNaN(phone)) {
            return true;
        } else {
            return false;
        }
    },
    //详情页秒杀逻辑
    detail: {
        //详情页初始化
        init: function (params) {
            //用户手机验证和登录,计时交互
            //规划交互流程
            //由于我们不在客户端做登录验证，所以放在客户端验证.在cookie中，查找手机号
            var killPhone = $.cookie('killPhone');

            //验证手机号
            if (!seckill.validatePhone(killPhone)) {
                //绑定phone
                //控制输出
                var killPhoneModal = $('#killPhoneModal');
                //显示弹出层
                killPhoneModal.modal({
                    show: true,//显示弹出层
                    backdrop: 'static',//禁止未知关闭
                    keyboard: false//关闭键盘事件
                });
                $('#killPhoneBtn').click(function () {
                    var inputPhone = $('#killPhoneKey').val();
                    if (seckill.validatePhone(inputPhone)) {
                        //电话写入cookie
                        $.cookie('killPhone', inputPhone, {
                            expires: 7,
                            path: '/seckilldemo'
                        });
                        //刷新页面
                        window.location.reload();
                    } else {
                        $('#killPhoneMessage').hide().html('<label class="label label-danger">手机号错误!</label>').show(300);
                    }
                });

            }
            //已经登录了
            var seckillId = params.seckillId;
            var startTime = params.startTime;
            var endTime = params.endTime;

            $.get(seckill.URL.now(), {}, function (result) {
                if (result && result['success']) {
                    var nowTime = result['data'];
                    //时间判断,计时交互
                    seckill.countdown(seckillId,nowTime,startTime,endTime);
                } else {
                    console.log("now-result" + result);
                }
            });
        }
    },
    countdown: function (seckillId, nowTime, startTime, endTime) {
        var seckillBox = $('#seckill-box');
        //时间判断
        if (nowTime > endTime){
            //秒杀结束
            seckillBox.html('秒杀结束');
        }else if(nowTime < startTime){
            //计时绑定
            var killTime = new Date(startTime + 1000);//加一秒防止计时偏移
            seckillBox.countdown(killTime,function(event){
                //控制时间的格式
                var format = event.strftime('秒杀倒计时： %D天 %H时 %M分 %S秒');
                seckillBox.html(format);
            }).on('finish.countdown',function () {//时间完成后回调事件
                seckill.handleSeckillkill(seckillId,seckillBox);
            });
        }else {
            //秒杀开始
            seckill.handleSeckillkill(seckillId,seckillBox);
        }
    },
    handleSeckillkill:function (seckillId,node) {//获取秒杀地址，控制显示逻辑，执行秒杀

        node.hide().html('<button class="btn btn-primary btn-lg" id="killBtn">秒杀!</button>');

        $.post(seckill.URL.exposer(seckillId),{},function (result) {
            //回调函数中，执行交互流程
            if (result && result['success']){
                var exposer = result['data'];
                if (exposer['exposed']){
                    //如果在秒杀状态，执行秒杀
                    //获取秒杀地址
                    var md5 = exposer['md5'];
                    var killUrl = seckill.URL.execution(seckillId,md5);

                    $("#killBtn").one('click',function () {//绑定一次，防止用户紧张后多次点击,对服务器不好
                        //执行秒杀请求的操作
                        //1.先禁用按钮
                        $(this).addClass('disabled');
                        //2.发送请求,执行秒杀
                        $.post(killUrl,{},function (result) {
                            if (result){

                                var killResult = result['data'];
                                var state = killResult['state'];
                                var stateInfo = killResult['stateInfo'];

                                if (result['success']){
                                    //3.显示秒杀结果，成功
                                    node.html('<span class="label label-success">'+stateInfo+'</span>');
                                }else {
                                    //3.失败
                                    node.html('<span class="label label-warning">'+stateInfo+'</span>');
                                }

                            }else {
                                console.log("killUrl-result:"+result['data']);
                            }
                        });
                    });
                    node.show();//显示绑定好的按钮
                } else {
                    //未开启秒杀,客户端之间的偏差，让他重新计算计时逻辑
                    var now = exposer['now'];
                    var start = exposer['start'];
                    var end = exposer['end'];
                    seckill.countdown(seckillId,now,start,end);
                }
            }else {
                console.log('exposer-result:'+result);
            }
        });
    }
}