var hogan = require("hogan");

var str =
    '<div class="heading"> \
         <h1 class="pull-left headline"><span>{{title}}</span><input class="form-control client-title" {{#settings}}disabled{{/settings}} name="title" data-event="group:changetitle" data-id="{{id}}" value="{{title}}" type="text"></h1> \
         <div class="pull-right">\
             <div class="btn-group">\
                 <button type="button" {{^up}}disabled{{/up}} data-action="switch-all" data-type="off" class="btn btn-lg btn-size client-state-off"><i class="fa fa-lg fa-fw fa-power-off"></i></button>\
                 <button type="button" {{^up}}disabled{{/up}} data-action="switch-all" data-type="on" class="btn btn-lg btn-size client-state-on"><i class="fa fa-lg fa-fw fa-power-off"></i></button>\
             </div>\
             <div class="btn-group btn-group-config">\
                 {{#editable}}<button type="button" class="btn btn-lg btn-size btn-default  js-button-changeurl-all" data-toggle="collapse" data-target="#collapse-{{id}}" aria-expanded="false" aria-controls="collapse-{{id}}"><i class="fa fa-fw fa-lg fa-terminal"></i></button>{{/editable}}\
                 <button type="button" class="btn btn-lg btn-size btn-default {{^settings}}active{{/settings}} js-settings"><i class="fa fa-fw fa-lg fa-cog"></i></button>\
             </div>\
         </div>\
     </div>\
     <div class="clients-heading-url-wrapper collapse" id="collapse-{{id}}">\
         <div class="clients-heading-url"><input class="form-control" data-event="client:changeurl-all" name="url" value="" type="url"></div>\
     </div>';

var template = hogan.compile(str);

module.exports = function (data) {
    return template.render(data);
};

module.exports.template = template;
