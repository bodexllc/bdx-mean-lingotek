var myApp = angular.module('myApp', []);
myApp.controller('AppCtrl', ['$scope', '$http', function($scope, $http) {
    console.log("Welcome MEAN Multilingual App");
    $scope.transdata = "...";
    $scope.mydisabled=false; 
    $scope.addDocument = function() {
      $scope.transdata='';
        $scope.mydisabled=true; 
        $http.post('/trans', $scope.document).success(function(response) {
            $scope.transdata = response;
            $scope.mydisabled=false;
            console.log('/translation executed');
        });

    }

}]);