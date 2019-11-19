package ArrayList;

public class Person {
    private String Name;
    private int Age;
    private String Gender;
    
    public Person(String n,int a,String g){
        Name=n;
        Age=a;
        Gender=g;
    }
    
    public String getName(){
        return Name;
    }
    
    public int getAge(){
        return Age;
    }
    
    public String getGender(){
        return Gender;
    }
}
